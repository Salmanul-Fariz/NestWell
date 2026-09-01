import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Income, IncomeDocument } from './schemas/income.schema';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { buildDateFilter } from '../../common/utils/date-range';

@Injectable()
export class IncomeService {
  constructor(
    @InjectModel(Income.name)
    private readonly incomeModel: Model<IncomeDocument>,
  ) {}

  async findAll(
    userId: string,
    filter: { month?: string; year?: string } = {},
  ): Promise<IncomeDocument[]> {
    const query: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    const dateFilter = buildDateFilter(filter.month, filter.year);
    if (dateFilter) query.date = dateFilter;

    return this.incomeModel.find(query).sort({ date: -1 }).exec();
  }

  async findOne(userId: string, id: string): Promise<IncomeDocument> {
    const income = await this.incomeModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!income) {
      throw new NotFoundException('Income not found');
    }
    return income;
  }

  async create(userId: string, dto: CreateIncomeDto): Promise<IncomeDocument> {
    const income = new this.incomeModel({
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
    return income.save();
  }

  async update(userId: string, id: string, dto: UpdateIncomeDto): Promise<IncomeDocument> {
    const updateData: any = { ...dto };
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.recurring === false) {
      updateData.recurrence = null;
    } else if (dto.recurrence) {
      updateData.recurrence = {
        ...dto.recurrence,
        interval: dto.recurrence.interval ?? 1,
        nextRunDate: new Date(dto.recurrence.nextRunDate),
        endDate: dto.recurrence.endDate ? new Date(dto.recurrence.endDate) : null,
      };
    }

    const updated = await this.incomeModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: updateData },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException('Income not found');
    }
    return updated;
  }

  async remove(userId: string, id: string): Promise<{ success: boolean }> {
    const res = await this.incomeModel
      .findOneAndDelete({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!res) {
      throw new NotFoundException('Income not found');
    }
    return { success: true };
  }
}
