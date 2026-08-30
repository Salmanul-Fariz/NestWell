import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LendBorrow, LendBorrowDocument } from './schemas/lend-borrow.schema';
import { Party, PartyDocument } from '../party/schemas/party.schema';
import { CreateLendBorrowDto } from './dto/create-lend-borrow.dto';
import { AddEntryDto } from './dto/add-entry.dto';
import { SettleEntryDto } from './dto/settle-entry.dto';

@Injectable()
export class LendBorrowService {
  constructor(
    @InjectModel(LendBorrow.name)
    private readonly lendBorrowModel: Model<LendBorrowDocument>,
    @InjectModel(Party.name)
    private readonly partyModel: Model<PartyDocument>,
  ) {}

  private calculateBalance(entries: Array<{ type: string; amount: number }>): number {
    return entries.reduce((acc, curr) => {
      if (curr.type === 'LEND') {
        return acc + curr.amount;
      } else if (curr.type === 'BORROW') {
        return acc - curr.amount;
      }
      return acc;
    }, 0);
  }

  async findAll(userId: string): Promise<LendBorrowDocument[]> {
    return this.lendBorrowModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('partyId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<LendBorrowDocument> {
    const record = await this.lendBorrowModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .populate('partyId')
      .exec();
    if (!record) {
      throw new NotFoundException('Lend/Borrow ledger not found');
    }
    return record;
  }

  async create(userId: string, dto: CreateLendBorrowDto): Promise<LendBorrowDocument> {
    const party = await this.partyModel.findOne({
      _id: new Types.ObjectId(dto.partyId),
      userId: new Types.ObjectId(userId),
    });
    if (!party) {
      throw new NotFoundException('Party not found');
    }

    const existing = await this.lendBorrowModel.findOne({
      userId: new Types.ObjectId(userId),
      partyId: new Types.ObjectId(dto.partyId),
    });
    if (existing) {
      throw new ConflictException('Ledger for this party already exists');
    }

    const record = new this.lendBorrowModel({
      userId: new Types.ObjectId(userId),
      partyId: new Types.ObjectId(dto.partyId),
      entries: [],
      balance: 0,
    });
    return record.save();
  }

  async addEntry(userId: string, id: string, dto: AddEntryDto): Promise<LendBorrowDocument> {
    const ledger = await this.findOne(userId, id);

    const newEntry = {
      _id: new Types.ObjectId(),
      type: dto.type,
      amount: dto.amount,
      date: dto.date ? new Date(dto.date) : new Date(),
      note: dto.note ?? '',
      isSettlement: false,
      createdAt: new Date(),
    };

    ledger.entries.push(newEntry as any);
    ledger.balance = this.calculateBalance(ledger.entries);

    return ledger.save();
  }

  async settle(userId: string, id: string, dto: SettleEntryDto): Promise<LendBorrowDocument> {
    const ledger = await this.findOne(userId, id);
    const currentBalance = ledger.balance;

    if (currentBalance === 0) {
      throw new BadRequestException('Balance is already 0. No settlement required.');
    }

    let settleAmount: number;
    if (dto.amount !== undefined) {
      if (dto.amount <= 0) {
        throw new BadRequestException('Settlement amount must be positive');
      }
      if (dto.amount > Math.abs(currentBalance)) {
        throw new BadRequestException(
          `Settlement amount (${dto.amount}) cannot exceed current outstanding balance (${Math.abs(currentBalance)})`,
        );
      }
      settleAmount = dto.amount;
    } else {
      settleAmount = Math.abs(currentBalance);
    }

    // Append-only settlement logic:
    // If balance > 0 (they owe you), repayment acts as BORROW to reduce balance.
    // If balance < 0 (you owe them), repayment acts as LEND to increase balance towards 0.
    const settlementType = currentBalance > 0 ? 'BORROW' : 'LEND';

    const settlementEntry = {
      _id: new Types.ObjectId(),
      type: settlementType,
      amount: settleAmount,
      date: new Date(),
      note: 'Settlement payment',
      isSettlement: true,
      createdAt: new Date(),
    };

    ledger.entries.push(settlementEntry as any);
    ledger.balance = this.calculateBalance(ledger.entries);

    return ledger.save();
  }
}
