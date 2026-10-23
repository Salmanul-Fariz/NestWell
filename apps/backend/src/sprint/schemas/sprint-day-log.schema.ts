import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type SprintDayLogDocument = SprintDayLog & Document;

@Schema({ timestamps: true })
export class SprintDayLog {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  day: number;

  @Prop({ type: String, required: true, index: true })
  date: string;

  @Prop({ type: Boolean, default: false })
  isWeekend: boolean;

  @Prop({ type: Number, min: 0, max: 24, default: null })
  sleepHours?: number | null;

  @Prop({ type: Number, min: 0, max: 24, default: null })
  focusHours?: number | null;

  @Prop({ type: String, default: '', maxlength: 4000 })
  accomplishments: string;

  @Prop({ type: String, default: '', maxlength: 4000 })
  obstacles: string;
}

export const SprintDayLogSchema = SchemaFactory.createForClass(SprintDayLog);
SprintDayLogSchema.index({ userId: 1, day: 1 }, { unique: true });
SprintDayLogSchema.index({ userId: 1, date: 1 }, { unique: true });
