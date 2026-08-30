import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from '../expense/schemas/expense.schema';
import { Income, IncomeDocument } from '../income/schemas/income.schema';
import { Emi, EmiDocument } from '../emi/schemas/emi.schema';
import { LendBorrow, LendBorrowDocument } from '../lend-borrow/schemas/lend-borrow.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Income.name)
    private readonly incomeModel: Model<IncomeDocument>,
    @InjectModel(Emi.name)
    private readonly emiModel: Model<EmiDocument>,
    @InjectModel(LendBorrow.name)
    private readonly lendBorrowModel: Model<LendBorrowDocument>,
  ) {}

  async getMonthlyReport(userId: string, month: number, year: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const userObjectId = new Types.ObjectId(userId);

    const [expenses, income, expensesByCategory, incomeBySource] = await Promise.all([
      this.expenseModel.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalExpense: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      this.incomeModel.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalIncome: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      this.expenseModel.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      this.incomeModel.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: '$source',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalExpense = expenses[0]?.totalExpense || 0;
    const totalIncome = income[0]?.totalIncome || 0;
    const netSavings = totalIncome - totalExpense;

    return {
      month,
      year,
      totalIncome,
      totalExpense,
      netSavings,
      expensesByCategory,
      incomeBySource,
    };
  }

  async getYearlyReport(userId: string, year: number) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const userObjectId = new Types.ObjectId(userId);

    const [monthlyExpenses, monthlyIncome] = await Promise.all([
      this.expenseModel.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: startOfYear, $lte: endOfYear },
          },
        },
        {
          $group: {
            _id: { $month: '$date' },
            totalAmount: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.incomeModel.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: startOfYear, $lte: endOfYear },
          },
        },
        {
          $group: {
            _id: { $month: '$date' },
            totalAmount: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const expenseItem = monthlyExpenses.find((e) => e._id === month);
      const incomeItem = monthlyIncome.find((inc) => inc._id === month);
      const expense = expenseItem?.totalAmount || 0;
      const income = incomeItem?.totalAmount || 0;

      return {
        month,
        income,
        expense,
        netSavings: income - expense,
      };
    });

    const totalIncome = monthsData.reduce((acc, curr) => acc + curr.income, 0);
    const totalExpense = monthsData.reduce((acc, curr) => acc + curr.expense, 0);

    return {
      year,
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      months: monthsData,
    };
  }
}
