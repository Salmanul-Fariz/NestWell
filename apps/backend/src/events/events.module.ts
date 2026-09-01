import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventReminderSchedulerService } from './event-reminder-scheduler.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    NotificationsModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, EventReminderSchedulerService],
  exports: [EventsService, EventReminderSchedulerService],
})
export class EventsModule {}
