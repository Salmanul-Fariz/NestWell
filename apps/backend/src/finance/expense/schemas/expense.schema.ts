import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { EXPENSE_CATEGORIES, FINANCE_RECURRENCE_FREQS } from '@nestwell/shared-types';
import type { ExpenseCategory, FinanceRecurrenceFreq } from '@nestwell/shared-types';

export type ExpenseDocument = Expense & Document;

@Schema({ _id: false })
export class FinanceRecurrence {
  @Prop({
    type: String,
    enum: FINANCE_RECURRENCE_FREQS,
    required: true,
  })
  frequency: FinanceRecurrenceFreq;

  @Prop({ type: Number, default: 1, min: 1 })
  interval: number;

  @Prop({ type: Date, required: true })
  nextRunDate: Date;

  @Prop({ type: Date, default: null })
  endDate?: Date | null;
}

export const FinanceRecurrenceSchema = SchemaFactory.createForClass(FinanceRecurrence);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Expense {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String, default: 'INR' })
  currency: string;

  @Prop({
    type: String,
    enum: EXPENSE_CATEGORIES,
    required: true,
    index: true,
  })
  category: ExpenseCategory;

  @Prop({ default: '', trim: true })
  note: string;

  @Prop({ type: Date, required: true, index: true, default: Date.now })
  date: Date;

  @Prop({ type: Boolean, default: false })
  recurring: boolean;

  @Prop({ type: FinanceRecurrenceSchema, default: null })
  recurrence?: FinanceRecurrence | null;

  createdAt: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, category: 1, date: -1 });
