import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WebPushChannel } from './channels/web-push.channel';
import { WhatsappChannel } from './channels/whatsapp.channel';
import {
  NotificationSetting,
  NotificationSettingSchema,
} from './schemas/notification-setting.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationSetting.name, schema: NotificationSettingSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, WebPushChannel, WhatsappChannel],
  exports: [NotificationsService],
})
export class NotificationsModule {}
