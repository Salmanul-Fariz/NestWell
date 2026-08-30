import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { IncomeService } from './income.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('finance/income')
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Get()
  findAll(@CurrentUser('userId') userId: string) {
    return this.incomeService.findAll(userId);
  }

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateIncomeDto,
  ) {
    return this.incomeService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateIncomeDto,
  ) {
    return this.incomeService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.incomeService.remove(userId, id);
  }
}
