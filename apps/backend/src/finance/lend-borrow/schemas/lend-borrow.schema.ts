import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { LEND_BORROW_TYPES } from '@nestwell/shared-types';
import type { LendBorrowType } from '@nestwell/shared-types';

export type LendBorrowDocument = LendBorrow & Document;

@Schema({ _id: true, timestamps: { createdAt: true, updatedAt: false } })
export class LendBorrowEntry {
  _id: Types.ObjectId;

  @Prop({
    type: String,
    enum: LEND_BORROW_TYPES,
    required: true,
  })
  type: LendBorrowType;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: Date, required: true, default: Date.now })
  date: Date;

  @Prop({ default: '', trim: true })
  note: string;

  @Prop({ type: Boolean, default: false })
  isSettlement: boolean;

  createdAt: Date;
}

export const LendBorrowEntrySchema = SchemaFactory.createForClass(LendBorrowEntry);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class LendBorrow {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Party', required: true, index: true })
  partyId: Types.ObjectId;

  @Prop({ type: [LendBorrowEntrySchema], default: [] })
  entries: LendBorrowEntry[];

  @Prop({ type: Number, default: 0 })
  balance: number; // derived: sum(lend) - sum(borrow)

  createdAt: Date;
}

export const LendBorrowSchema = SchemaFactory.createForClass(LendBorrow);
LendBorrowSchema.index({ userId: 1, partyId: 1 }, { unique: true });
