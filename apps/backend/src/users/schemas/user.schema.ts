import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null })
  refreshTokenHash?: string | null;

  /** Kept briefly so an in-flight request using the pre-rotation token is not rejected. */
  @Prop({ type: String, default: null })
  previousRefreshTokenHash?: string | null;

  @Prop({ type: Date, default: null })
  refreshTokenRotatedAt?: Date | null;

  createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
