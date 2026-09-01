import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expense, ExpenseSchema } from '../expense/schemas/expense.schema';
import { Income, IncomeSchema } from '../income/schemas/income.schema';
import { LendBorrow, LendBorrowSchema } from '../lend-borrow/schemas/lend-borrow.schema';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: Income.name, schema: IncomeSchema },
      { name: LendBorrow.name, schema: LendBorrowSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
