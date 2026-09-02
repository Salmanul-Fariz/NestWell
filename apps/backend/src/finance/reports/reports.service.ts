import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from '../expense/schemas/expense.schema';
import { Income, IncomeDocument } from '../income/schemas/income.schema';
import { LendBorrow, LendBorrowDocument } from '../lend-borrow/schemas/lend-borrow.schema';
import { utcMonthRange, utcYearRange } from '../../common/utils/date-range';
import { NotificationsService } from '../../notifications/notifications.service';

type DateRange = { start: Date; end: Date };

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Income.name)
    private readonly incomeModel: Model<IncomeDocument>,
    @InjectModel(LendBorrow.name)
    private readonly lendBorrowModel: Model<LendBorrowDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private weekOfMonthExpr(datePath: string) {
    return {
      $switch: {
        branches: [
          { case: { $lte: [{ $dayOfMonth: datePath }, 7] }, then: 1 },
          { case: { $lte: [{ $dayOfMonth: datePath }, 14] }, then: 2 },
          { case: { $lte: [{ $dayOfMonth: datePath }, 21] }, then: 3 },
        ],
        default: 4,
      },
    };
  }

  /**
   * Party cash entries within range.
   */
  private partyEntriesMatch(userObjectId: Types.ObjectId, range: DateRange) {
    return [
      { $match: { userId: userObjectId } },
      { $unwind: '$entries' },
      {
        $match: {
          'entries.date': { $gte: range.start, $lte: range.end },
        },
      },
    ];
  }

  /**
   * Helper to summarize all-time or period party balances.
   */
  private computePartyBalances(ledgers: LendBorrowDocument[]) {
    let netLendBalance = 0; // Total money owed to the user across all parties (Assets)
    let netBorrowBalance = 0; // Total money the user owes across all parties (Liabilities)
    let totalLendGiven = 0;
    let totalBorrowReceived = 0;
    let totalRepaymentsReceived = 0;
    let totalRepaymentsPaid = 0;

    for (const ledger of ledgers) {
      const bal = ledger.balance; // derived: sum(lend) - sum(borrow)
      if (bal > 0) {
        netLendBalance += bal;
      } else if (bal < 0) {
        netBorrowBalance += Math.abs(bal);
      }

      for (const entry of ledger.entries || []) {
        if (!entry.isSettlement) {
          if (entry.type === 'LEND') totalLendGiven += entry.amount;
          if (entry.type === 'BORROW') totalBorrowReceived += entry.amount;
        } else {
          // When a settlement entry has type LEND, it was repayment made to pay off debt (Cash Outflow)
          // When a settlement entry has type BORROW, it was repayment received to clear loan (Cash Inflow)
          if (entry.type === 'LEND') totalRepaymentsPaid += entry.amount;
          if (entry.type === 'BORROW') totalRepaymentsReceived += entry.amount;
        }
      }
    }

    // Party Cash Impact: (Borrow In - Lend Out) + (Repayments In - Repayments Out)
    // Equivalent to all BORROW amounts minus all LEND amounts (settlements included).
    const partyCashFlow =
      totalBorrowReceived - totalLendGiven + totalRepaymentsReceived - totalRepaymentsPaid;

    return {
      netLendBalance,
      netBorrowBalance,
      totalLendGiven,
      totalBorrowReceived,
      totalRepaymentsReceived,
      totalRepaymentsPaid,
      partyCashFlow,
    };
  }

  /** Cash from ledger entries in a period. Every LEND is cash out; every BORROW is cash in (settlements too). */
  private partyCashFlowInRange(ledgers: LendBorrowDocument[], range: DateRange) {
    const start = range.start.getTime();
    const end = range.end.getTime();
    let lendOut = 0;
    let borrowIn = 0;

    for (const ledger of ledgers) {
      for (const entry of ledger.entries || []) {
        const t = new Date(entry.date).getTime();
        if (t < start || t > end) continue;
        if (entry.type === 'LEND') lendOut += entry.amount;
        else if (entry.type === 'BORROW') borrowIn += entry.amount;
      }
    }

    return {
      periodLendOut: lendOut,
      periodBorrowIn: borrowIn,
      periodPartyCashFlow: borrowIn - lendOut,
    };
  }

  async getMonthlyReport(userId: string, month: number, year: number) {
    const range = utcMonthRange(year, month);
    const userObjectId = new Types.ObjectId(userId);
    const dateMatch = { userId: userObjectId, date: { $gte: range.start, $lte: range.end } };

    const [
      expenses,
      income,
      expensesByCategory,
      incomeBySource,
      weeklyExpenses,
      weeklyIncome,
      weeklyParty,
      allLedgers,
    ] = await Promise.all([
      this.expenseModel.aggregate([
        { $match: dateMatch },
        { $group: { _id: null, totalExpense: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.incomeModel.aggregate([
        { $match: dateMatch },
        { $group: { _id: null, totalIncome: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.expenseModel.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.incomeModel.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$source', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.expenseModel.aggregate([
        { $match: dateMatch },
        { $group: { _id: this.weekOfMonthExpr('$date'), totalAmount: { $sum: '$amount' } } },
      ]),
      this.incomeModel.aggregate([
        { $match: dateMatch },
        { $group: { _id: this.weekOfMonthExpr('$date'), totalAmount: { $sum: '$amount' } } },
      ]),
      this.lendBorrowModel.aggregate([
        ...this.partyEntriesMatch(userObjectId, range),
        {
          $group: {
            _id: { week: this.weekOfMonthExpr('$entries.date'), type: '$entries.type' },
            totalAmount: { $sum: '$entries.amount' },
          },
        },
      ]),
      this.lendBorrowModel.find({ userId: userObjectId }).exec(),
    ]);

    const totalExpense = expenses[0]?.totalExpense || 0;
    const totalIncome = income[0]?.totalIncome || 0;

    const {
      netLendBalance,
      netBorrowBalance,
      totalLendGiven,
      totalBorrowReceived,
      totalRepaymentsReceived,
      totalRepaymentsPaid,
    } = this.computePartyBalances(allLedgers);

    const { periodLendOut, periodBorrowIn, periodPartyCashFlow } = this.partyCashFlowInRange(
      allLedgers,
      range,
    );

    // Period savings = income − expense ± this month's lend/borrow/settlements
    const monthSavings = totalIncome - totalExpense + periodPartyCashFlow;
    const netSavings = monthSavings;

    const weeks = [1, 2, 3, 4].map((week) => {
      const expenseItem = weeklyExpenses.find((e) => e._id === week);
      const incomeItem = weeklyIncome.find((inc) => inc._id === week);
      const lendItem = weeklyParty.find((t) => t._id?.week === week && t._id?.type === 'LEND');
      const borrowItem = weeklyParty.find((t) => t._id?.week === week && t._id?.type === 'BORROW');
      const expense = expenseItem?.totalAmount || 0;
      const inc = incomeItem?.totalAmount || 0;
      const lend = lendItem?.totalAmount || 0;
      const borrow = borrowItem?.totalAmount || 0;
      return {
        week,
        income: inc,
        expense,
        lend,
        borrow,
        transactions: lend + borrow,
        outflow: expense,
        net: inc - expense + borrow - lend,
      };
    });

    return {
      month,
      year,
      totalIncome,
      totalExpense,
      monthSavings,
      netLendBalance,
      netBorrowBalance,
      totalLendGiven,
      totalBorrowReceived,
      totalRepaymentsReceived,
      totalRepaymentsPaid,
      periodLendOut,
      periodBorrowIn,
      periodPartyCashFlow,
      toReceive: netLendBalance,
      toPay: netBorrowBalance,
      netSavings,
      expensesByCategory,
      incomeBySource,
      weeks,
    };
  }

  async getYearlyReport(userId: string, year: number) {
    const range = utcYearRange(year);
    const userObjectId = new Types.ObjectId(userId);
    const dateMatch = { userId: userObjectId, date: { $gte: range.start, $lte: range.end } };

    const [
      monthlyExpenses,
      monthlyIncome,
      monthlyParty,
      expensesByCategory,
      allLedgers,
    ] = await Promise.all([
      this.expenseModel.aggregate([
        { $match: dateMatch },
        { $group: { _id: { $month: '$date' }, totalAmount: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
      this.incomeModel.aggregate([
        { $match: dateMatch },
        { $group: { _id: { $month: '$date' }, totalAmount: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
      this.lendBorrowModel.aggregate([
        ...this.partyEntriesMatch(userObjectId, range),
        {
          $group: {
            _id: { month: { $month: '$entries.date' }, type: '$entries.type' },
            totalAmount: { $sum: '$entries.amount' },
          },
        },
        { $sort: { '_id.month': 1 } },
      ]),
      this.expenseModel.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.lendBorrowModel.find({ userId: userObjectId }).exec(),
    ]);

    const {
      netLendBalance,
      netBorrowBalance,
      totalLendGiven,
      totalBorrowReceived,
      totalRepaymentsReceived,
      totalRepaymentsPaid,
    } = this.computePartyBalances(allLedgers);

    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const expense = monthlyExpenses.find((e) => e._id === month)?.totalAmount || 0;
      const income = monthlyIncome.find((inc) => inc._id === month)?.totalAmount || 0;
      const lend =
        monthlyParty.find((t) => t._id?.month === month && t._id?.type === 'LEND')?.totalAmount || 0;
      const borrow =
        monthlyParty.find((t) => t._id?.month === month && t._id?.type === 'BORROW')?.totalAmount || 0;

      return {
        month,
        income,
        expense,
        lend,
        borrow,
        transactions: lend + borrow,
        outflow: expense,
        netSavings: income - expense + borrow - lend,
      };
    });

    const totalIncome = monthsData.reduce((acc, curr) => acc + curr.income, 0);
    const totalExpense = monthsData.reduce((acc, curr) => acc + curr.expense, 0);
    const { periodLendOut, periodBorrowIn, periodPartyCashFlow } = this.partyCashFlowInRange(
      allLedgers,
      range,
    );
    const yearSavings = totalIncome - totalExpense + periodPartyCashFlow;

    return {
      year,
      totalIncome,
      totalExpense,
      monthSavings: yearSavings,
      netLendBalance,
      netBorrowBalance,
      totalLendGiven,
      totalBorrowReceived,
      totalRepaymentsReceived,
      totalRepaymentsPaid,
      periodLendOut,
      periodBorrowIn,
      periodPartyCashFlow,
      toReceive: netLendBalance,
      toPay: netBorrowBalance,
      netSavings: yearSavings,
      months: monthsData,
      expensesByCategory,
    };
  }

  async sendMonthlySummaryWhatsapp(userId: string, month: number, year: number) {
    const data = await this.getMonthlyReport(userId, month, year);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthName = monthNames[month - 1] || 'Current Month';

    const fmt = (val: number) =>
      `${val < 0 ? '-₹' : '₹'}${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    let msg = `📊 *NestWell Financial Overview — ${monthName} ${year}*\n\n`;
    msg += `📈 *Month Savings:* ${fmt(data.monthSavings)}\n`;
    msg += `🟢 *Total Income:* ${fmt(data.totalIncome)}\n`;
    msg += `🔴 *Total Expenses:* ${fmt(data.totalExpense)}\n`;
    msg += `↔️ *Party cash (month):* ${fmt(data.periodPartyCashFlow)}\n\n`;
    msg += `👥 *Contacts Standing:*\n`;
    msg += `• *To Receive (Lent):* ${fmt(data.netLendBalance)}\n`;
    msg += `• *To Pay (Borrowed):* ${fmt(data.netBorrowBalance)}\n\n`;
    msg += `_Generated from your NestWell ledger_`;

    return this.notificationsService.sendWhatsapp(userId, msg);
  }
}
