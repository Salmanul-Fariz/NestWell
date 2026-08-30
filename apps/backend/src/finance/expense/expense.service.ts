import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from './schemas/expense.schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  async findAll(userId: string): Promise<ExpenseDocument[]> {
    return this.expenseModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ date: -1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<ExpenseDocument> {
    const expense = await this.expenseModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async create(userId: string, dto: CreateExpenseDto): Promise<ExpenseDocument> {
    const expense = new this.expenseModel({
      ...dto,
      userId: new Types.ObjectId(userId),
      date: dto.date ? new Date(dto.date) : new Date(),
      recurrence: dto.recurrence
        ? {
            ...dto.recurrence,
            interval: dto.recurrence.interval ?? 1,
            nextRunDate: new Date(dto.recurrence.nextRunDate),
            endDate: dto.recurrence.endDate ? new Date(dto.recurrence.endDate) : null,
          }
        : null,
    });
    return expense.save();
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto): Promise<ExpenseDocument> {
    const updateData: any = { ...dto };
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.recurrence) {
      updateData.recurrence = {
        ...dto.recurrence,
        interval: dto.recurrence.interval ?? 1,
        nextRunDate: new Date(dto.recurrence.nextRunDate),
        endDate: dto.recurrence.endDate ? new Date(dto.recurrence.endDate) : null,
      };
    }

    const updated = await this.expenseModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: updateData },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException('Expense not found');
    }
    return updated;
  }

  async remove(userId: string, id: string): Promise<{ success: boolean }> {
    const res = await this.expenseModel
      .findOneAndDelete({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!res) {
      throw new NotFoundException('Expense not found');
    }
    return { success: true };
  }
}
