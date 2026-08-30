import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('finance/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly')
  getMonthlyReport(
    @CurrentUser('userId') userId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const m = month ? parseInt(month, 10) : currentMonth;
    const y = year ? parseInt(year, 10) : currentYear;

    return this.reportsService.getMonthlyReport(userId, m, y);
  }

  @Get('yearly')
  getYearlyReport(
    @CurrentUser('userId') userId: string,
    @Query('year') year?: string,
  ) {
    const currentYear = new Date().getFullYear();
    const y = year ? parseInt(year, 10) : currentYear;

    return this.reportsService.getYearlyReport(userId, y);
  }
}
