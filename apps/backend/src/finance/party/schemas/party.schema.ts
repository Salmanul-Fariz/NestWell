import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type PartyDocument = Party & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Party {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null, trim: true })
  email?: string | null;

  @Prop({ type: String, default: null, trim: true })
  phone?: string | null;

  @Prop({ default: '' })
  notes: string;

  createdAt: Date;
}

export const PartySchema = SchemaFactory.createForClass(Party);
PartySchema.index({ userId: 1, name: 1 });
