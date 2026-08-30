import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Emi, EmiDocument } from './schemas/emi.schema';
import { CreateEmiDto } from './dto/create-emi.dto';

interface InstallmentItem {
  dueDate: Date;
  amount: number;
  paid: boolean;
  paidDate: Date | null;
}

@Injectable()
export class EmiService {
  constructor(
    @InjectModel(Emi.name)
    private readonly emiModel: Model<EmiDocument>,
  ) {}

  private calculateEmiAmount(principal: number, annualRate: number, tenureMonths: number): number {
    if (annualRate === 0) {
      return Math.round((principal / tenureMonths) * 100) / 100;
    }
    const monthlyRate = annualRate / (12 * 100);
    const emi =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi * 100) / 100;
  }

  private generateInstallments(
    startDate: Date,
    tenureMonths: number,
    installmentAmount: number,
  ): InstallmentItem[] {
    const installments: InstallmentItem[] = [];
    for (let i = 1; i <= tenureMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      installments.push({
        dueDate,
        amount: installmentAmount,
        paid: false,
        paidDate: null,
      });
    }
    return installments;
  }

  async findAll(userId: string): Promise<EmiDocument[]> {
    return this.emiModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<EmiDocument> {
    const emi = await this.emiModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!emi) {
      throw new NotFoundException('EMI record not found');
    }
    return emi;
  }

  async create(userId: string, dto: CreateEmiDto): Promise<EmiDocument> {
    const startDate = new Date(dto.startDate);
    const installmentAmount =
      dto.installmentAmount ??
      this.calculateEmiAmount(dto.principal, dto.interestRate, dto.tenureMonths);

    const installments = this.generateInstallments(
      startDate,
      dto.tenureMonths,
      installmentAmount,
    );

    const emi = new this.emiModel({
      userId: new Types.ObjectId(userId),
      loanName: dto.loanName,
      principal: dto.principal,
      interestRate: dto.interestRate,
      tenureMonths: dto.tenureMonths,
      startDate,
      installmentAmount,
      status: 'ACTIVE',
      installments,
    });

    return emi.save();
  }

  async markInstallmentPaid(
    userId: string,
    emiId: string,
    installmentId: string,
  ): Promise<EmiDocument> {
    const emi = await this.findOne(userId, emiId);
    const installment = (emi.installments as any).id(installmentId);
    if (!installment) {
      throw new NotFoundException('Installment not found');
    }

    installment.paid = true;
    installment.paidDate = new Date();

    const allPaid = emi.installments.every((inst) => inst.paid);
    if (allPaid) {
      emi.status = 'CLOSED';
    }

    return emi.save();
  }
}
