import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { EventRecurrenceFreq } from '@nestwell/shared-types';

@Injectable()
export class EventReminderSchedulerService {
  private readonly logger = new Logger(EventReminderSchedulerService.name);

  constructor(
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Run every 15 minutes to evaluate upcoming and recurring event alerts
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleEventRemindersCron() {
    this.logger.log('Checking event reminder alerts & recurring occurrences...');
    const now = new Date();
    await this.processEventReminders(now);
  }

  /** Calculate if a recurring or one-time event occurs on a target calendar date (YYYY-MM-DD) */
  private getEventOccurrenceForDate(event: EventDocument, targetDate: Date): Date | null {
    const start = new Date(event.startAt);
    const startYear = start.getFullYear();
    const startMonth = start.getMonth();
    const startDay = start.getDate();

    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();

    const freq: EventRecurrenceFreq = event.recurrence?.freq || 'NONE';
    const interval = event.recurrence?.interval || 1;
    const until = event.recurrence?.until ? new Date(event.recurrence.until) : null;

    if (until && targetDate > until) return null;

    if (freq === 'NONE') {
      if (startYear === targetYear && startMonth === targetMonth && startDay === targetDay) {
        return new Date(start);
      }
      return null;
    }

    if (targetDate < new Date(startYear, startMonth, startDay)) {
      return null;
    }

    if (freq === 'YEARLY') {
      if (startMonth === targetMonth && startDay === targetDay) {
        const yearDiff = targetYear - startYear;
        if (yearDiff >= 0 && yearDiff % interval === 0) {
          const occ = new Date(start);
          occ.setFullYear(targetYear);
          return occ;
        }
      }
      return null;
    }

    if (freq === 'MONTHLY') {
      if (startDay === targetDay) {
        const monthDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth);
        if (monthDiff >= 0 && monthDiff % interval === 0) {
          const occ = new Date(start);
          occ.setFullYear(targetYear, targetMonth, startDay);
          return occ;
        }
      }
      return null;
    }

    if (freq === 'WEEKLY') {
      const diffTime = targetDate.getTime() - new Date(startYear, startMonth, startDay).getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays % (7 * interval) === 0) {
        const occ = new Date(start);
        occ.setFullYear(targetYear, targetMonth, targetDay);
        return occ;
      }
      return null;
    }

    if (freq === 'DAILY') {
      const diffTime = targetDate.getTime() - new Date(startYear, startMonth, startDay).getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays % interval === 0) {
        const occ = new Date(start);
        occ.setFullYear(targetYear, targetMonth, targetDay);
        return occ;
      }
      return null;
    }

    return null;
  }

  async processEventReminders(now = new Date()) {
    try {
      const events = await this.eventModel.find({
        reminders: { $exists: true, $not: { $size: 0 } },
      });

      // Check occurrences in a lookahead window (today + 30 days)
      for (const event of events) {
        for (const reminder of event.reminders) {
          const offsetMinutes = reminder.offsetMinutes;
          // Time when this alert should trigger
          const alertTargetTime = new Date(now.getTime() + offsetMinutes * 60 * 1000);

          // Find if there is an occurrence on that target date
          const occurrenceDate = this.getEventOccurrenceForDate(event, alertTargetTime);
          if (!occurrenceDate) continue;

          const occurrenceKey = `${occurrenceDate.toISOString().slice(0, 10)}_${offsetMinutes}`;

          if (!event.notifiedOccurrences) {
            event.notifiedOccurrences = [];
          }

          if (event.notifiedOccurrences.includes(occurrenceKey)) {
            continue;
          }

          const formattedCategory = (event.category || 'Event')
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());

          const daysText =
            offsetMinutes === 0
              ? 'Today'
              : offsetMinutes >= 1440
                ? `In ${Math.round(offsetMinutes / 1440)} day(s)`
                : `In ${Math.round(offsetMinutes / 60)} hour(s)`;

          const formattedDate = occurrenceDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          const categoryIcons: Record<string, string> = {
            BIRTHDAY: '🎂',
            ANNIVERSARY: '💍',
            SUBSCRIPTION_RENEWAL: '💳',
            BILL_PAYMENT: '🧾',
            MEDICAL_APPOINTMENT: '🏥',
            MEETING: '💼',
            TASK_DEADLINE: '⏰',
            TRAVEL: '✈️',
            HOLIDAY: '🌴',
            FAMILY: '👨‍👩‍👧',
            MAINTENANCE: '🛠️',
            OTHER: '📌',
          };

          const icon = categoryIcons[(event.category || 'OTHER').toUpperCase()] || '🔔';

          // Web Push Message
          const pushTitle = `${icon} ${event.title} (${daysText})`;
          const pushBody = `${formattedCategory} • ${formattedDate}${event.location ? ' • 📍 ' + event.location : ''}`;

          // WhatsApp Message
          let waMessage = `${icon} *Reminder: ${event.title}*\n\n`;
          waMessage += `🏷️ *Category:* ${formattedCategory}\n`;
          waMessage += `📅 *Date:* ${formattedDate} (${daysText})\n`;
          if (event.location) {
            waMessage += `📍 *Location:* ${event.location}\n`;
          }
          if (event.description) {
            waMessage += `📝 *Notes:* ${event.description}\n`;
          }
          waMessage += `\n_Automated reminder from NestWell_`;

          try {
            await this.notificationsService.sendPush(event.userId.toString(), {
              title: pushTitle,
              body: pushBody,
              url: '/events',
            }).catch((err) => {
              this.logger.warn(`Push dispatch failed: ${err?.message || err}`);
            });

            // Also send WhatsApp if user configured it
            await this.notificationsService.sendWhatsapp(
              event.userId.toString(),
              waMessage.trim(),
            ).catch((err) => {
              this.logger.warn(`WhatsApp dispatch failed: ${err?.message || err}`);
            });

            event.notifiedOccurrences.push(occurrenceKey);
            event.markModified('notifiedOccurrences');
            await event.save();
            this.logger.log(`Sent reminder alert for event "${event.title}" [${occurrenceKey}]`);
          } catch (sendErr) {
            this.logger.warn(`Failed to dispatch alert for event ${event._id}: ${sendErr}`);
          }
        }
      }
    } catch (err) {
      this.logger.error('Error processing event reminders', err);
    }
  }
}
