import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type SprintTaskDocument = SprintTask & Document;

@Schema({ timestamps: true })
export class SprintTask {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ type: String, enum: ['todo', 'doing', 'done'], default: 'todo' })
  status: 'todo' | 'doing' | 'done';

  @Prop({ type: String, enum: ['high', 'medium', 'low'], default: 'medium' })
  priority: 'high' | 'medium' | 'low';

  @Prop({ type: String, default: '' })
  deadline: string;

  @Prop({ type: Number, default: 1, min: 0, max: 24 })
  hours: number;

  @Prop({ type: String, default: '', maxlength: 4000 })
  notes: string;
}

export const SprintTaskSchema = SchemaFactory.createForClass(SprintTask);
SprintTaskSchema.index({ userId: 1, deadline: 1, status: 1 });
