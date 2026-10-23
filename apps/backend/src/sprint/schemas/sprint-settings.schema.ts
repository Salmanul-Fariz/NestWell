import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type SprintSettingsDocument = SprintSettings & Document;

@Schema({ timestamps: true })
export class SprintSettings {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  startDate: string;

  @Prop({ type: Number, required: true, min: 1, max: 3650 })
  totalDays: number;

  @Prop({ type: [Number], default: [0, 6] })
  weekendDays: number[];
}

export const SprintSettingsSchema = SchemaFactory.createForClass(SprintSettings);
