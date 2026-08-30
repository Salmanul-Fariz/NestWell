import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expense, ExpenseSchema } from '../expense/schemas/expense.schema';
import { Income, IncomeSchema } from '../income/schemas/income.schema';
import { Emi, EmiSchema } from '../emi/schemas/emi.schema';
import { LendBorrow, LendBorrowSchema } from '../lend-borrow/schemas/lend-borrow.schema';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: Income.name, schema: IncomeSchema },
      { name: Emi.name, schema: EmiSchema },
      { name: LendBorrow.name, schema: LendBorrowSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
