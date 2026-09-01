import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type PasswordEntryDocument = PasswordEntry & Document;

@Schema({ timestamps: true })
export class PasswordEntry {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '', trim: true })
  username: string;

  @Prop({ required: true })
  encryptedPassword: string;

  @Prop({ default: '', trim: true })
  url: string;

  @Prop({ default: '' })
  notes: string;

  @Prop({ default: 'OTHER', trim: true, uppercase: true })
  category: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PasswordEntrySchema = SchemaFactory.createForClass(PasswordEntry);
PasswordEntrySchema.index({ userId: 1, category: 1 });
