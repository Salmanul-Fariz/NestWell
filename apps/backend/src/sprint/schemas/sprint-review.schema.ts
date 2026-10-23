import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type SprintReviewDocument = SprintReview & Document;

@Schema({ timestamps: true })
export class SprintReview {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: ['weekly', 'final'], default: 'weekly' })
  type: 'weekly' | 'final';

  @Prop({ type: Number, min: 1, default: null })
  week?: number | null;

  @Prop({ type: String, default: '', maxlength: 4000 })
  summary: string;

  @Prop({ type: String, default: '', maxlength: 4000 })
  change: string;

  @Prop({ type: String, default: '', maxlength: 4000 })
  tests: string;
}

export const SprintReviewSchema = SchemaFactory.createForClass(SprintReview);
SprintReviewSchema.index({ userId: 1, createdAt: -1 });
