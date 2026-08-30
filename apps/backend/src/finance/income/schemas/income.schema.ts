import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { INCOME_SOURCES } from '@nestwell/shared-types';
import type { IncomeSource } from '@nestwell/shared-types';
import { FinanceRecurrence, FinanceRecurrenceSchema } from '../../expense/schemas/expense.schema';

export type IncomeDocument = Income & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Income {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String, default: 'INR' })
  currency: string;

  @Prop({
    type: String,
    enum: INCOME_SOURCES,
    required: true,
    index: true,
  })
  source: IncomeSource;

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

export const IncomeSchema = SchemaFactory.createForClass(Income);
IncomeSchema.index({ userId: 1, date: -1 });
IncomeSchema.index({ userId: 1, source: 1, date: -1 });
