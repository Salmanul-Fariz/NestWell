import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { EmiService } from './emi.service';
import { CreateEmiDto } from './dto/create-emi.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('finance/emi')
export class EmiController {
  constructor(private readonly emiService: EmiService) {}

  @Get()
  findAll(@CurrentUser('userId') userId: string) {
    return this.emiService.findAll(userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.emiService.findOne(userId, id);
  }

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateEmiDto,
  ) {
    return this.emiService.create(userId, dto);
  }

  @Patch(':id/installment/:installmentId/mark-paid')
  markPaid(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
  ) {
    return this.emiService.markInstallmentPaid(userId, id, installmentId);
  }
}
