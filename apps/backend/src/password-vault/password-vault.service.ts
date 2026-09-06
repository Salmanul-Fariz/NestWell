import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PasswordEntry,
  PasswordEntryDocument,
} from './schemas/password-entry.schema';
import { CreatePasswordEntryDto } from './dto/create-password-entry.dto';
import { UpdatePasswordEntryDto } from './dto/update-password-entry.dto';
import { decryptVaultPassword, encryptVaultPassword } from './vault-crypto';

const DEFAULT_REVEAL_SECONDS = 30;
const MAX_REVEAL_SECONDS = 60;

@Injectable()
export class PasswordVaultService {
  constructor(
    @InjectModel(PasswordEntry.name)
    private readonly vaultModel: Model<PasswordEntryDocument>,
  ) {}

  async findAll(userId: string): Promise<PasswordEntryDocument[]> {
    return this.vaultModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('-encryptedPassword')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<PasswordEntryDocument> {
    const entry = await this.vaultModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!entry) {
      throw new NotFoundException('Password entry not found');
    }
    return entry;
  }

  async create(
    userId: string,
    dto: CreatePasswordEntryDto,
  ): Promise<PasswordEntryDocument> {
    const { password, ...metadata } = dto;
    const created = new this.vaultModel({
      ...metadata,
      encryptedPassword: encryptVaultPassword(password),
      userId: new Types.ObjectId(userId),
    });
    return created.save();
  }

  async update(
    userId: string,
    id: string,
    dto: UpdatePasswordEntryDto,
  ): Promise<PasswordEntryDocument> {
    const { password, ...metadata } = dto;
    const updated = await this.vaultModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        {
          $set: {
            ...metadata,
            ...(password
              ? { encryptedPassword: encryptVaultPassword(password) }
              : {}),
          },
        },
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
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!res) {
      throw new NotFoundException('Password entry not found');
    }
    return { success: true };
  }

  async reveal(
    userId: string,
    id: string,
    expiresInSeconds = DEFAULT_REVEAL_SECONDS,
  ) {
    const entry = await this.vaultModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .select('+encryptedPassword')
      .exec();
    if (!entry) {
      throw new NotFoundException('Password entry not found');
    }

    const seconds = Math.min(
      Math.max(Math.trunc(expiresInSeconds), 1),
      MAX_REVEAL_SECONDS,
    );
    try {
      return {
        password: decryptVaultPassword(entry.encryptedPassword),
        expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('previous client-encryption format')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
