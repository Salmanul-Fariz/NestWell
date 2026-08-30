import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PasswordEntry, PasswordEntryDocument } from './schemas/password-entry.schema';
import { CreatePasswordEntryDto } from './dto/create-password-entry.dto';
import { UpdatePasswordEntryDto } from './dto/update-password-entry.dto';

@Injectable()
export class PasswordVaultService {
  constructor(
    @InjectModel(PasswordEntry.name)
    private readonly vaultModel: Model<PasswordEntryDocument>,
  ) {}

  async findAll(userId: string): Promise<PasswordEntryDocument[]> {
    return this.vaultModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<PasswordEntryDocument> {
    const entry = await this.vaultModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!entry) {
      throw new NotFoundException('Password entry not found');
    }
    return entry;
  }

  async create(userId: string, dto: CreatePasswordEntryDto): Promise<PasswordEntryDocument> {
    const created = new this.vaultModel({
      ...dto,
      userId: new Types.ObjectId(userId),
    });
    return created.save();
  }

  async update(userId: string, id: string, dto: UpdatePasswordEntryDto): Promise<PasswordEntryDocument> {
    const updated = await this.vaultModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException('Password entry not found');
    }
    return updated;
  }

  async remove(userId: string, id: string): Promise<{ success: boolean }> {
    const res = await this.vaultModel
      .findOneAndDelete({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!res) {
      throw new NotFoundException('Password entry not found');
    }
    return { success: true };
  }
}
