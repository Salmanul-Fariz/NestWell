import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { LendBorrowService } from './lend-borrow.service';
import { CreateLendBorrowDto } from './dto/create-lend-borrow.dto';
import { AddEntryDto } from './dto/add-entry.dto';
import { SettleEntryDto } from './dto/settle-entry.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('finance/lend-borrow')
export class LendBorrowController {
  constructor(private readonly lendBorrowService: LendBorrowService) {}

  @Get()
  findAll(@CurrentUser('userId') userId: string) {
    return this.lendBorrowService.findAll(userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.lendBorrowService.findOne(userId, id);
  }

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateLendBorrowDto,
  ) {
    return this.lendBorrowService.create(userId, dto);
  }

  @Post(':id/entry')
  addEntry(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: AddEntryDto,
  ) {
    return this.lendBorrowService.addEntry(userId, id, dto);
  }

  @Post(':id/settle')
  settle(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: SettleEntryDto,
  ) {
    return this.lendBorrowService.settle(userId, id, dto);
  }
}
