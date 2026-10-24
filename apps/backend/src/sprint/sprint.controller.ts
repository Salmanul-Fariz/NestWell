import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  BulkDeleteSprintTasksDto,
  CreateSprintReviewDto,
  CreateSprintTaskDto,
  ExtendSprintDto,
  SprintSettingsDto,
  UpdateSprintDayLogDto,
  UpdateSprintTaskDto,
} from './dto/sprint.dto';
import { SprintService } from './sprint.service';

@Controller('sprint')
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Get('settings')
  getSettings(@CurrentUser('userId') userId: string) {
    return this.sprintService.getSettings(userId);
  }

  @Post('settings')
  configure(
    @CurrentUser('userId') userId: string,
    @Body() dto: SprintSettingsDto,
  ) {
    return this.sprintService.configure(userId, dto);
  }

  @Delete('settings')
  removeSprint(@CurrentUser('userId') userId: string) {
    return this.sprintService.removeSprint(userId);
  }

  @Post('settings/extend')
  extend(
    @CurrentUser('userId') userId: string,
    @Body() dto: ExtendSprintDto,
  ) {
    return this.sprintService.extend(userId, dto.days);
  }

  @Get('tasks')
  findTasks(
    @CurrentUser('userId') userId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.sprintService.findTasks(userId, {
      status,
      priority,
      from,
      to,
      search,
    });
  }

  @Post('tasks')
  createTask(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSprintTaskDto,
  ) {
    return this.sprintService.createTask(userId, dto);
  }

  @Post('tasks/bulk-delete')
  deleteTasks(
    @CurrentUser('userId') userId: string,
    @Body() dto: BulkDeleteSprintTasksDto,
  ) {
    return this.sprintService.deleteTasks(userId, dto.ids);
  }

  @Patch('tasks/:id')
  updateTask(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSprintTaskDto,
  ) {
    return this.sprintService.updateTask(userId, id, dto);
  }

  @Delete('tasks/:id')
  deleteTask(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.sprintService.deleteTask(userId, id);
  }

  @Get('logs')
  findLogs(@CurrentUser('userId') userId: string) {
    return this.sprintService.findLogs(userId);
  }

  @Put('logs/:day')
  updateLog(
    @CurrentUser('userId') userId: string,
    @Param('day', ParseIntPipe) day: number,
    @Body() dto: UpdateSprintDayLogDto,
  ) {
    return this.sprintService.updateLog(userId, day, dto);
  }

  @Get('reviews')
  listReviews(@CurrentUser('userId') userId: string) {
    return this.sprintService.listReviews(userId);
  }

  @Post('reviews')
  createReview(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSprintReviewDto,
  ) {
    return this.sprintService.createReview(userId, dto);
  }

  @Put('reviews/:id')
  updateReview(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateSprintReviewDto,
  ) {
    return this.sprintService.updateReview(userId, id, dto);
  }

  @Delete('reviews/:id')
  deleteReview(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.sprintService.deleteReview(userId, id);
  }

  @Get('stats')
  getStats(@CurrentUser('userId') userId: string) {
    return this.sprintService.getStats(userId);
  }

  @Get('analytics')
  getAnalytics(
    @CurrentUser('userId') userId: string,
    @Query('period') period = 'week',
    @Query('week') week?: string,
  ) {
    return this.sprintService.getAnalytics(userId, period, week);
  }

  @Get('stats/week/:week')
  getWeekStats(
    @CurrentUser('userId') userId: string,
    @Param('week', ParseIntPipe) week: number,
  ) {
    return this.sprintService.getWeekStats(userId, week);
  }
}
