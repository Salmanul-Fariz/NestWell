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
      // Include recurring events OR events matching the date range
      const rangeCond: any = {};
      if (from) rangeCond.$gte = new Date(from);
      if (to) rangeCond.$lte = new Date(to);

      filter.$or = [
        { startAt: rangeCond },
        { 'recurrence.freq': { $in: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] } },
      ];
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
      category: dto.category || 'REMINDER',
      location: dto.location?.trim() ?? '',
      startAt: new Date(dto.startAt),
      endAt: dto.endAt ? new Date(dto.endAt) : null,
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
    const setData: Record<string, unknown> = { ...dto };

    if (dto.startAt) setData.startAt = new Date(dto.startAt);

    if (dto.endAt) {
      setData.endAt = new Date(dto.endAt);
    } else if (dto.endAt === null) {
      setData.endAt = null;
    } else {
      delete setData.endAt;
    }

    if (typeof dto.location === 'string') {
      setData.location = dto.location.trim();
    }

    if (dto.recurrence) {
      setData.recurrence = {
        ...dto.recurrence,
        interval: dto.recurrence.interval ?? 1,
        until: dto.recurrence.until ? new Date(dto.recurrence.until) : null,
      };
    }

    const updated = await this.eventModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: setData },
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
