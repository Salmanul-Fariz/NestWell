import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
  ) {}

  async findAll(userId: string, from?: string, to?: string): Promise<EventDocument[]> {
    const filter: any = { userId: new Types.ObjectId(userId) };

    if (from || to) {
      filter.startAt = {};
      if (from) filter.startAt.$gte = new Date(from);
      if (to) filter.startAt.$lte = new Date(to);
    }

    return this.eventModel.find(filter).sort({ startAt: 1 }).exec();
  }

  async findOne(userId: string, id: string): Promise<EventDocument> {
    const event = await this.eventModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async create(userId: string, dto: CreateEventDto): Promise<EventDocument> {
    const event = new this.eventModel({
      ...dto,
      userId: new Types.ObjectId(userId),
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      recurrence: dto.recurrence
        ? {
            ...dto.recurrence,
            until: dto.recurrence.until ? new Date(dto.recurrence.until) : null,
          }
        : undefined,
    });
    return event.save();
  }

  async update(userId: string, id: string, dto: UpdateEventDto): Promise<EventDocument> {
    const updateData: any = { ...dto };
    if (dto.startAt) updateData.startAt = new Date(dto.startAt);
    if (dto.endAt) updateData.endAt = new Date(dto.endAt);
    if (dto.recurrence && dto.recurrence.until) {
      updateData.recurrence = {
        ...dto.recurrence,
        until: new Date(dto.recurrence.until),
      };
    }

    const updated = await this.eventModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: updateData },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException('Event not found');
    }
    return updated;
  }

  async remove(userId: string, id: string): Promise<{ success: boolean }> {
    const res = await this.eventModel
      .findOneAndDelete({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!res) {
      throw new NotFoundException('Event not found');
    }
    return { success: true };
  }
}
