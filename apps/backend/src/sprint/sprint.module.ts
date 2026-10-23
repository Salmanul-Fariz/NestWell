import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SprintDayLog, SprintDayLogSchema } from './schemas/sprint-day-log.schema';
import { SprintReview, SprintReviewSchema } from './schemas/sprint-review.schema';
import { SprintSettings, SprintSettingsSchema } from './schemas/sprint-settings.schema';
import { SprintTask, SprintTaskSchema } from './schemas/sprint-task.schema';
import { SprintController } from './sprint.controller';
import { SprintService } from './sprint.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SprintTask.name, schema: SprintTaskSchema },
      { name: SprintDayLog.name, schema: SprintDayLogSchema },
      { name: SprintReview.name, schema: SprintReviewSchema },
      { name: SprintSettings.name, schema: SprintSettingsSchema },
    ]),
  ],
  controllers: [SprintController],
  providers: [SprintService],
})
export class SprintModule {}
