import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ _id: false })
export class EventRecurrence {
  @Prop({
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
    default: 'none',
  })
  freq: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

  @Prop({ type: Number, default: 1 })
  interval: number;

  @Prop({ type: Date, default: null })
  until?: Date | null;
}

export const EventRecurrenceSchema = SchemaFactory.createForClass(EventRecurrence);

@Schema({ _id: false })
export class EventReminder {
  @Prop({ type: Number, required: true })
  offsetMinutes: number;
}

export const EventReminderSchema = SchemaFactory.createForClass(EventReminder);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Event {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({ default: '', trim: true })
  location: string;

  @Prop({ type: Date, required: true, index: true })
  startAt: Date;

  @Prop({ type: Date, required: true })
  endAt: Date;

  @Prop({ type: Boolean, default: false })
  allDay: boolean;

  @Prop({ type: EventRecurrenceSchema, default: () => ({ freq: 'none', interval: 1, until: null }) })
  recurrence: EventRecurrence;

  @Prop({ type: [EventReminderSchema], default: [] })
  reminders: EventReminder[];

  createdAt: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
EventSchema.index({ userId: 1, startAt: 1, endAt: 1 });
