import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { EMI_STATUSES } from '@nestwell/shared-types';
import type { EmiStatus } from '@nestwell/shared-types';

export type EmiDocument = Emi & Document;

@Schema({ _id: true })
export class EmiInstallment {
  _id: Types.ObjectId;

  @Prop({ type: Date, required: true })
  dueDate: Date;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Boolean, default: false })
  paid: boolean;

  @Prop({ type: Date, default: null })
  paidDate?: Date | null;
}

export const EmiInstallmentSchema = SchemaFactory.createForClass(EmiInstallment);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Emi {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  loanName: string;

  @Prop({ type: Number, required: true, min: 0 })
  principal: number;

  @Prop({ type: Number, required: true, min: 0 })
  interestRate: number; // annual percentage

  @Prop({ type: Number, required: true, min: 1 })
  tenureMonths: number;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Number, required: true })
  installmentAmount: number;

  @Prop({
    type: String,
    enum: EMI_STATUSES,
    default: 'ACTIVE',
    index: true,
  })
  status: EmiStatus;

  @Prop({ type: [EmiInstallmentSchema], default: [] })
  installments: EmiInstallment[];

  createdAt: Date;
}

export const EmiSchema = SchemaFactory.createForClass(Emi);
EmiSchema.index({ userId: 1, status: 1 });
