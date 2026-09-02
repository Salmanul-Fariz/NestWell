import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  SubscribePushDto,
  UnsubscribePushDto,
  UpdateNotificationSettingsDto,
} from './dto/notification.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('settings')
  getSettings(@CurrentUser('userId') userId: string) {
    return this.notificationsService.getSettings(userId);
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsService.updateSettings(userId, dto);
  }

  @Post('push/subscribe')
  @HttpCode(HttpStatus.OK)
  subscribe(@CurrentUser('userId') userId: string, @Body() dto: SubscribePushDto) {
    return this.notificationsService.subscribePush(userId, dto);
  }

  @Post('push/unsubscribe')
  @HttpCode(HttpStatus.OK)
  unsubscribe(@CurrentUser('userId') userId: string, @Body() dto: UnsubscribePushDto) {
    return this.notificationsService.unsubscribePush(userId, dto);
  }
}
