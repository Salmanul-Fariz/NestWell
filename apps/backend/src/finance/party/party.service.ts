import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Party, PartyDocument } from './schemas/party.schema';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';

@Injectable()
export class PartyService {
  constructor(
    @InjectModel(Party.name)
    private readonly partyModel: Model<PartyDocument>,
  ) {}

  async findAll(userId: string): Promise<PartyDocument[]> {
    return this.partyModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ name: 1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<PartyDocument> {
    const party = await this.partyModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!party) {
      throw new NotFoundException('Party not found');
    }
    return party;
  }

  async create(userId: string, dto: CreatePartyDto): Promise<PartyDocument> {
    const party = new this.partyModel({
      ...dto,
      userId: new Types.ObjectId(userId),
    });
    return party.save();
  }

  async update(userId: string, id: string, dto: UpdatePartyDto): Promise<PartyDocument> {
    const updated = await this.partyModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException('Party not found');
    }
    return updated;
  }
}
