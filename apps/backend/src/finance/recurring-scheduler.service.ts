import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Income, IncomeDocument } from './income/schemas/income.schema';
import { Expense, ExpenseDocument } from './expense/schemas/expense.schema';
import { FinanceRecurrenceFreq } from '@nestwell/shared-types';

@Injectable()
export class RecurringFinanceSchedulerService {
  private readonly logger = new Logger(RecurringFinanceSchedulerService.name);

  constructor(
    @InjectModel(Income.name)
    private readonly incomeModel: Model<IncomeDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  // Run automatically at midnight every day
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRecurringCron() {
    this.logger.log('Executing recurring finance items scheduler...');
    const now = new Date();
    await this.processRecurringIncomes(now);
    await this.processRecurringExpenses(now);
  }

  private getNextDate(current: Date, freq: FinanceRecurrenceFreq, interval = 1): Date {
    const next = new Date(current);
    switch (freq) {
      case 'WEEKLY':
        next.setDate(next.getDate() + 7 * interval);
        break;
      case 'MONTHLY': {
        const originalDay = current.getDate();
        next.setMonth(next.getMonth() + interval);
        if (next.getDate() !== originalDay) {
          next.setDate(0);
        }
        break;
      }
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + interval);
        break;
      default:
        next.setMonth(next.getMonth() + interval);
    }
    return next;
  }

  async processRecurringIncomes(targetDate = new Date()) {
    try {
      const activeRecurring = await this.incomeModel.find({
        recurring: true,
        'recurrence.nextRunDate': { $lte: targetDate },
      });

      for (const parent of activeRecurring) {
        if (!parent.recurrence) continue;

        let currentRunDate = new Date(parent.recurrence.nextRunDate);
        const { frequency, interval = 1, endDate } = parent.recurrence;

        // Process all intervals due up to targetDate
        while (currentRunDate <= targetDate) {
          if (endDate && currentRunDate > new Date(endDate)) {
            parent.recurring = false;
            parent.recurrence = null;
            break;
          }

          // Auto-generate transaction instance
          await this.incomeModel.create({
            userId: parent.userId,
            amount: parent.amount,
            currency: parent.currency,
            source: parent.source,
            note: parent.note ? `${parent.note} (Auto-recurring)` : 'Auto-recurring income',
            date: currentRunDate,
            recurring: false,
            recurrence: null,
          });

          currentRunDate = this.getNextDate(currentRunDate, frequency, interval);
        }

        if (parent.recurring && parent.recurrence) {
          if (endDate && currentRunDate > new Date(endDate)) {
            parent.recurring = false;
            parent.recurrence = null;
          } else {
            parent.recurrence.nextRunDate = currentRunDate;
            parent.markModified('recurrence');
          }
        }

        await parent.save();
      }
    } catch (err) {
      this.logger.error('Error processing recurring incomes', err);
    }
  }

  async processRecurringExpenses(targetDate = new Date()) {
    try {
      const activeRecurring = await this.expenseModel.find({
        recurring: true,
        'recurrence.nextRunDate': { $lte: targetDate },
      });

      for (const parent of activeRecurring) {
        if (!parent.recurrence) continue;

        let currentRunDate = new Date(parent.recurrence.nextRunDate);
        const { frequency, interval = 1, endDate } = parent.recurrence;

        while (currentRunDate <= targetDate) {
          if (endDate && currentRunDate > new Date(endDate)) {
            parent.recurring = false;
            parent.recurrence = null;
            break;
          }

          // Auto-generate transaction instance
          await this.expenseModel.create({
            userId: parent.userId,
            amount: parent.amount,
            currency: parent.currency,
            category: parent.category,
            note: parent.note ? `${parent.note} (Auto-recurring)` : 'Auto-recurring expense',
            date: currentRunDate,
            recurring: false,
            recurrence: null,
          });

          currentRunDate = this.getNextDate(currentRunDate, frequency, interval);
        }

        if (parent.recurring && parent.recurrence) {
          if (endDate && currentRunDate > new Date(endDate)) {
            parent.recurring = false;
            parent.recurrence = null;
          } else {
            parent.recurrence.nextRunDate = currentRunDate;
            parent.markModified('recurrence');
          }
        }

        await parent.save();
      }
    } catch (err) {
      this.logger.error('Error processing recurring expenses', err);
    }
  }
}
