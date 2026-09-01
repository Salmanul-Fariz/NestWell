import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('finance/expense')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get()
  findAll(
    @CurrentUser('userId') userId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.expenseService.findAll(userId, { month, year });
  }

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenseService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenseService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.expenseService.remove(userId, id);
  }
}
