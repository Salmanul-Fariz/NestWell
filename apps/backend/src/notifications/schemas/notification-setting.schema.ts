import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type NotificationSettingDocument = NotificationSetting & Document;

@Schema({ _id: false })
export class PushSubscriptionKeys {
  @Prop({ type: String, required: true })
  p256dh: string;

  @Prop({ type: String, required: true })
  auth: string;
}

export const PushSubscriptionKeysSchema =
  SchemaFactory.createForClass(PushSubscriptionKeys);

@Schema({ _id: false })
export class StoredPushSubscription {
  @Prop({ type: String, required: true })
  endpoint: string;

  @Prop({ type: PushSubscriptionKeysSchema, required: true })
  keys: PushSubscriptionKeys;

  /** Free-form browser/device hint so a user can tell their devices apart. */
  @Prop({ type: String, default: '' })
  label: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const StoredPushSubscriptionSchema =
  SchemaFactory.createForClass(StoredPushSubscription);

@Schema({ timestamps: true })
export class NotificationSetting {
  _id: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  pushEnabled: boolean;

  @Prop({ type: Boolean, default: false })
  whatsappEnabled: boolean;

  /** Phone in international format, e.g. +919876543210. */
  @Prop({ type: String, default: '', trim: true })
  whatsappPhone: string;

  /** Per-user CallMeBot key; falls back to the server-wide key when empty. */
  @Prop({ type: String, default: '', trim: true })
  whatsappApiKey: string;

  @Prop({ type: [StoredPushSubscriptionSchema], default: [] })
  pushSubscriptions: StoredPushSubscription[];
}

export const NotificationSettingSchema =
  SchemaFactory.createForClass(NotificationSetting);
