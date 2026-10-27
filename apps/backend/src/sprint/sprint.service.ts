import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSprintReviewDto, CreateSprintTaskDto, SprintSettingsDto, UpdateSprintDayLogDto, UpdateSprintTaskDto } from './dto/sprint.dto';
import { SprintDayLog, SprintDayLogDocument } from './schemas/sprint-day-log.schema';
import { SprintReview, SprintReviewDocument } from './schemas/sprint-review.schema';
import { SprintSettings, SprintSettingsDocument } from './schemas/sprint-settings.schema';
import { SprintTask, SprintTaskDocument } from './schemas/sprint-task.schema';

const DAY_MS = 86_400_000;
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type TaskStatus = 'todo' | 'doing' | 'done';

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function addDays(value: string, days: number): string {
  const date = parseDate(value);
  if (!date) throw new Error('Invalid sprint date stored in database.');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayOfWeek(value: string): number {
  const date = parseDate(value);
  if (!date) throw new Error('Invalid sprint date stored in database.');
  return date.getUTCDay();
}

function today(): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function escapedRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class SprintService {
  constructor(
    @InjectModel(SprintTask.name)
    private readonly taskModel: Model<SprintTaskDocument>,
    @InjectModel(SprintDayLog.name)
    private readonly dayLogModel: Model<SprintDayLogDocument>,
    @InjectModel(SprintReview.name)
    private readonly reviewModel: Model<SprintReviewDocument>,
    @InjectModel(SprintSettings.name)
    private readonly settingsModel: Model<SprintSettingsDocument>,
  ) {}

  private owner(userId: string): Types.ObjectId {
    return new Types.ObjectId(userId);
  }

  async getSettings(userId: string) {
    return this.settingsModel.findOne({ userId: this.owner(userId) }).exec();
  }

  async configure(userId: string, dto: SprintSettingsDto) {
    const owner = this.owner(userId);
    const existing = await this.settingsModel.findOne({ userId: owner }).exec();
    if (existing) throw new BadRequestException('Sprint setup is already complete.');
    if (!parseDate(dto.startDate)) {
      throw new BadRequestException('Choose a valid sprint start date.');
    }

    const logs = Array.from({ length: dto.totalDays }, (_, index) => {
      const date = addDays(dto.startDate, index);
      return {
        userId: owner,
        day: index + 1,
        date,
        isWeekend: dto.weekendDays.includes(dayOfWeek(date)),
      };
    });

    await this.dayLogModel.insertMany(logs);
    const starterTasks = dto.tasks?.map((title) => title.trim()) ?? [];
    if (starterTasks.some((title) => !title)) {
      throw new BadRequestException('Starter task names cannot be blank.');
    }
    if (starterTasks.length) {
      await this.taskModel.insertMany(
        starterTasks.map((title) => ({
          userId: owner,
          title: title.trim(),
          deadline: dto.startDate,
          status: 'todo',
          priority: 'medium',
          hours: 1,
        })),
      );
    }
    return this.settingsModel.create({
      userId: owner,
      startDate: dto.startDate,
      totalDays: dto.totalDays,
      weekendDays: dto.weekendDays,
    });
  }

  async updateStartDate(userId: string, startDate: string) {
    if (!parseDate(startDate)) {
      throw new BadRequestException('Choose a valid sprint start date.');
    }
    const owner = this.owner(userId);
    const settings = await this.settingsModel.findOne({ userId: owner }).exec();
    if (!settings) throw new NotFoundException('Set up a sprint before changing its start date.');
    if (settings.startDate === startDate) return settings;

    const oldStart = parseDate(settings.startDate);
    const newStart = parseDate(startDate);
    if (!oldStart || !newStart) {
      throw new BadRequestException('The current sprint start date is invalid.');
    }
    const dayShift = Math.round((newStart.getTime() - oldStart.getTime()) / DAY_MS);
    const logs = await this.dayLogModel
      .find({ userId: owner })
      .sort({ date: dayShift > 0 ? -1 : 1 })
      .exec();
    const tasks = await this.taskModel.find({ userId: owner }).exec();

    const taskUpdates = tasks.map((task) => {
      if (!task.deadline) return null;
      if (!parseDate(task.deadline)) {
        throw new BadRequestException(`Task "${task.title}" has an invalid scheduled date and could not be shifted.`);
      }
      return {
        updateOne: {
          filter: { _id: task._id, userId: owner },
          update: { $set: { deadline: addDays(task.deadline, dayShift) } },
        },
      };
    }).filter((update): update is NonNullable<typeof update> => update !== null);

    const logUpdates = logs.map((log) => ({
      updateOne: {
        filter: { _id: log._id, userId: owner },
        update: {
          $set: {
            date: addDays(startDate, log.day - 1),
            isWeekend: settings.weekendDays.includes(
              dayOfWeek(addDays(startDate, log.day - 1)),
            ),
          },
        },
      },
    }));
    if (logUpdates.length) await this.dayLogModel.bulkWrite(logUpdates);
    if (taskUpdates.length) await this.taskModel.bulkWrite(taskUpdates);

    settings.startDate = startDate;
    await settings.save();
    return settings;
  }

  async removeSprint(userId: string) {
    const owner = this.owner(userId);
    await Promise.all([
      this.taskModel.deleteMany({ userId: owner }).exec(),
      this.dayLogModel.deleteMany({ userId: owner }).exec(),
      this.reviewModel.deleteMany({ userId: owner }).exec(),
    ]);
    await this.settingsModel.deleteOne({ userId: owner }).exec();
    return { success: true };
  }

  async extend(userId: string, days: number) {
    const owner = this.owner(userId);
    const settings = await this.settingsModel.findOne({ userId: owner }).exec();
    if (!settings) throw new NotFoundException('Set up a sprint before extending it.');
    if (settings.totalDays + days > 3650) {
      throw new BadRequestException('A sprint cannot exceed 3650 days.');
    }
    const newLogs = Array.from({ length: days }, (_, index) => {
      const day = settings.totalDays + index + 1;
      const date = addDays(settings.startDate, day - 1);
      return {
        userId: owner,
        day,
        date,
        isWeekend: settings.weekendDays.includes(dayOfWeek(date)),
      };
    });
    await this.dayLogModel.insertMany(newLogs);
    settings.totalDays += days;
    await settings.save();
    return settings;
  }

  async findTasks(
    userId: string,
    filters: { status?: string; priority?: string; from?: string; to?: string; search?: string },
  ) {
    const query: Record<string, unknown> = { userId: this.owner(userId) };
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.from || filters.to) {
      query.deadline = {
        ...(filters.from ? { $gte: filters.from } : {}),
        ...(filters.to ? { $lte: filters.to } : {}),
      };
    }
    if (filters.search) query.title = new RegExp(escapedRegex(filters.search), 'i');
    return this.taskModel.find(query).sort({ deadline: 1, createdAt: 1 }).exec();
  }

  async createTask(userId: string, dto: CreateSprintTaskDto) {
    const owner = this.owner(userId);
    const { dates, ...task } = dto;
    task.title = task.title.trim();
    if (!task.title) throw new BadRequestException('Task title cannot be blank.');
    if (task.deadline && !parseDate(task.deadline)) {
      throw new BadRequestException('Choose a valid task date.');
    }
    if (dates) {
      const uniqueDates = [...new Set(dates)].sort();
      if (
        !uniqueDates.length ||
        uniqueDates.length > 90 ||
        uniqueDates.some((date) => !parseDate(date))
      ) {
        throw new BadRequestException('Choose between 1 and 90 valid task dates.');
      }
      return this.taskModel.insertMany(
        uniqueDates.map((deadline) => ({ ...task, deadline, userId: owner })),
      );
    }
    return this.taskModel.create({ ...task, userId: owner });
  }

  async deleteTasks(userId: string, ids: string[]) {
    if (ids.some((id) => !Types.ObjectId.isValid(id))) {
      throw new BadRequestException('Select valid tasks to delete.');
    }
    const result = await this.taskModel
      .deleteMany({ userId: this.owner(userId), _id: { $in: [...new Set(ids)] } })
      .exec();
    return { deleted: result.deletedCount };
  }

  async updateTask(userId: string, id: string, dto: UpdateSprintTaskDto) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid task ID.');
    if (dto.title !== undefined) {
      dto.title = dto.title.trim();
      if (!dto.title) throw new BadRequestException('Task title cannot be blank.');
    }
    if (dto.deadline && !parseDate(dto.deadline)) {
      throw new BadRequestException('Choose a valid task date.');
    }
    const task = await this.taskModel
      .findOneAndUpdate(
        { _id: id, userId: this.owner(userId) },
        { $set: dto },
        { new: true, runValidators: true },
      )
      .exec();
    if (!task) throw new NotFoundException('Task not found.');
    return task;
  }

  async deleteTask(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid task ID.');
    const task = await this.taskModel
      .findOneAndDelete({ _id: id, userId: this.owner(userId) })
      .exec();
    if (!task) throw new NotFoundException('Task not found.');
    return { success: true };
  }

  private async scoredLogs(userId: string) {
    const [logs, tasks] = await Promise.all([
      this.dayLogModel.find({ userId: this.owner(userId) }).sort({ day: 1 }).exec(),
      this.taskModel.find({ userId: this.owner(userId) }).exec(),
    ]);
    return logs.map((log) => {
      const dayTasks = tasks.filter((task) => task.deadline === log.date);
      const done = dayTasks.filter((task) => task.status === 'done').length;
      return {
        ...log.toJSON(),
        taskCounts: {
          total: dayTasks.length,
          done,
          doing: dayTasks.filter((task) => task.status === 'doing').length,
          todo: dayTasks.filter((task) => task.status === 'todo').length,
        },
        score: dayTasks.length ? Math.round((done / dayTasks.length) * 100) : 0,
      };
    });
  }

  async findLogs(userId: string) {
    return this.scoredLogs(userId);
  }

  async updateLog(userId: string, day: number, dto: UpdateSprintDayLogDto) {
    const log = await this.dayLogModel
      .findOneAndUpdate(
        { userId: this.owner(userId), day },
        { $set: dto },
        { new: true, runValidators: true },
      )
      .exec();
    if (!log) throw new NotFoundException('Sprint day not found.');
    const [scored] = await this.scoreLogRows(userId, [log]);
    return scored;
  }

  private async scoreLogRows(userId: string, logs: SprintDayLogDocument[]) {
    const tasks = await this.taskModel
      .find({
        userId: this.owner(userId),
        deadline: { $in: logs.map((log) => log.date) },
      })
      .exec();
    return logs.map((log) => {
      const dayTasks = tasks.filter((task) => task.deadline === log.date);
      const done = dayTasks.filter((task) => task.status === 'done').length;
      return {
        ...log.toJSON(),
        taskCounts: {
          total: dayTasks.length,
          done,
          doing: dayTasks.filter((task) => task.status === 'doing').length,
          todo: dayTasks.filter((task) => task.status === 'todo').length,
        },
        score: dayTasks.length ? Math.round((done / dayTasks.length) * 100) : 0,
      };
    });
  }

  async listReviews(userId: string) {
    return this.reviewModel
      .find({ userId: this.owner(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async createReview(userId: string, dto: CreateSprintReviewDto) {
    return this.reviewModel.create({ ...dto, userId: this.owner(userId) });
  }

  async updateReview(userId: string, id: string, dto: CreateSprintReviewDto) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid review ID.');
    const review = await this.reviewModel
      .findOneAndUpdate(
        { _id: id, userId: this.owner(userId) },
        { $set: dto },
        { new: true, runValidators: true },
      )
      .exec();
    if (!review) throw new NotFoundException('Review not found.');
    return review;
  }

  async deleteReview(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid review ID.');
    const review = await this.reviewModel
      .findOneAndDelete({ _id: id, userId: this.owner(userId) })
      .exec();
    if (!review) throw new NotFoundException('Review not found.');
    return { success: true };
  }

  private isCountable(log: { taskCounts: { total: number }; isWeekend: boolean; score: number }) {
    return log.taskCounts.total > 0 && !(log.isWeekend && log.score === 0);
  }

  async getStats(userId: string) {
    const owner = this.owner(userId);
    const [settings, tasks, logs] = await Promise.all([
      this.settingsModel.findOne({ userId: owner }).exec(),
      this.taskModel.find({ userId: owner }).exec(),
      this.scoredLogs(userId),
    ]);
    const date = today();
    const current = logs.find((log) => log.date === date);
    const past = logs.filter((log) => log.date <= date);
    const countable = past.filter((log) => this.isCountable(log));
    let streak = 0;
    for (const log of [...past].reverse()) {
      if (!this.isCountable(log)) continue;
      if (log.score > 0) streak++;
      else if (log.date !== date) break;
    }
    const doneTasks = tasks.filter((task) => task.status === 'done');
    const avgScore = countable.length
      ? Math.round(countable.reduce((total, log) => total + log.score, 0) / countable.length)
      : 0;
    const day = current?.day ?? 0;
    const lastDate = settings ? addDays(settings.startDate, settings.totalDays - 1) : '';

    return {
      settings,
      today: date,
      day,
      daysUntilStart: settings && date < settings.startDate
        ? Math.round((parseDate(settings.startDate)!.getTime() - parseDate(date)!.getTime()) / DAY_MS)
        : 0,
      hours: doneTasks.reduce((total, task) => total + (task.hours || 0), 0),
      tasksDone: doneTasks.length,
      tasksTotal: tasks.length,
      avgScore,
      streak,
      dailySummary: current?.accomplishments || '',
      dailyScore: current?.score || 0,
      dailyLog: current
        ? {
            day: current.day,
            date: current.date,
            focusVision: current.focusVision || '',
            accomplishments: current.accomplishments || '',
            obstacles: current.obstacles || '',
            spendingAmount: current.spendingAmount ?? null,
            spendingNotes: current.spendingNotes || '',
            followUps: current.followUps || '',
            tomorrowPriorities: current.tomorrowPriorities || [],
            sleepHours: current.sleepHours ?? null,
            focusHours: current.focusHours ?? null,
            isWeekend: current.isWeekend,
          }
        : null,
      scoreSeries: logs.map((log) => ({
        day: log.day,
        date: log.date,
        score: log.date <= date ? log.score : null,
      })),
      todayTasks: tasks
        .filter((task) => task.deadline === date)
        .sort((left, right) => left.title.localeCompare(right.title)),
      upcoming: tasks
        .filter((task) => task.status !== 'done' && task.deadline > date)
        .sort((left, right) => left.deadline.localeCompare(right.deadline) || left.title.localeCompare(right.title))
        .slice(0, 6),
      sprintEndDate: lastDate,
    };
  }

  async getAnalytics(userId: string, requestedPeriod: string, requestedWeek?: string) {
    const allowedPeriods = ['day', 'week', 'weekend', 'month', 'sprint'];
    const period = allowedPeriods.includes(requestedPeriod) ? requestedPeriod : 'week';
    const owner = this.owner(userId);
    const [settings, tasks, allLogs] = await Promise.all([
      this.settingsModel.findOne({ userId: owner }).exec(),
      this.taskModel.find({ userId: owner }).exec(),
      this.scoredLogs(userId),
    ]);
    const date = today();
    let from = date;
    let to = date;
    if (period === 'week') {
      if (requestedWeek !== undefined) {
        const week = Number(requestedWeek);
        const weekCount = settings
          ? Math.ceil(settings.totalDays / 7)
          : Math.max(1, Math.ceil(allLogs.length / 7));
        if (!Number.isInteger(week) || week < 1 || week > weekCount) {
          throw new BadRequestException('Choose a valid sprint week.');
        }
        const selectedWeek = Math.min(week, weekCount);
        const startDate = settings
          ? addDays(settings.startDate, (selectedWeek - 1) * 7)
          : allLogs[(selectedWeek - 1) * 7]?.date ?? date;
        const endDate = settings
          ? addDays(
              settings.startDate,
              Math.min(selectedWeek * 7, settings.totalDays) - 1,
            )
          : allLogs[Math.min(selectedWeek * 7, allLogs.length) - 1]?.date ?? date;
        from = startDate;
        to = endDate;
      } else {
        from = addDays(date, -6);
      }
    }
    if (period === 'weekend') from = addDays(date, -6);
    if (period === 'month') from = `${date.slice(0, 7)}-01`;
    if (period === 'sprint') from = settings?.startDate ?? allLogs[0]?.date ?? date;

    const logs = allLogs.filter(
      (log) =>
        log.date >= from &&
        log.date <= to &&
        (period !== 'weekend' || log.isWeekend),
    );
    const days = logs.map((log) => {
      const dayTasks = tasks.filter((task) => task.deadline === log.date);
      const completed = dayTasks.filter((task) => task.status === 'done');
      return {
        day: log.day,
        date: log.date,
        label: log.date.slice(5),
        isWeekend: log.isWeekend,
        sleepHours: log.sleepHours ?? null,
        focusHours: log.focusHours ?? null,
        score: log.score,
        hours: completed.reduce((total, task) => total + (task.hours || 0), 0),
        total: dayTasks.length,
        done: completed.length,
        doing: dayTasks.filter((task) => task.status === 'doing').length,
        todo: dayTasks.filter((task) => task.status === 'todo').length,
      };
    });
    const relevantDays = new Set(days.map((item) => item.date));
    const taskRangeEnd = period === 'week' && requestedWeek !== undefined ? to : date;
    const rangeTasks = tasks.filter(
      (task) =>
        task.deadline >= from &&
        task.deadline <= taskRangeEnd &&
        (period !== 'weekend' || relevantDays.has(task.deadline)),
    );
    const completedTasks = rangeTasks.filter((task) => task.status === 'done');
    const mean = (values: Array<number | null | undefined>) => {
      const present = values.filter((value): value is number => typeof value === 'number');
      return present.length
        ? +(present.reduce((sum, value) => sum + value, 0) / present.length).toFixed(1)
        : null;
    };
    const countable = logs.filter((log) => this.isCountable(log));

    return {
      period,
      from,
      to,
      days,
      metrics: {
        hours: completedTasks.reduce((sum, task) => sum + (task.hours || 0), 0),
        tasksTotal: rangeTasks.length,
        tasksDone: completedTasks.length,
        avgScore: countable.length
          ? Math.round(countable.reduce((sum, log) => sum + log.score, 0) / countable.length)
          : 0,
        activeDays: days.filter((day) => day.done > 0 || day.doing > 0).length,
        sleepAvg: mean(logs.map((log) => log.sleepHours)),
        focusAvg: mean(logs.map((log) => log.focusHours)),
      },
    };
  }

  async getWeekStats(userId: string, week: number) {
    if (!Number.isInteger(week) || week < 1 || week > 522) {
      throw new BadRequestException('Choose a valid sprint week.');
    }
    const fromDay = (week - 1) * 7 + 1;
    const [tasks, logs] = await Promise.all([
      this.taskModel.find({ userId: this.owner(userId) }).exec(),
      this.scoredLogs(userId),
    ]);
    const weekLogs = logs.filter((log) => log.day >= fromDay && log.day < fromDay + 7);
    const dates = new Set(weekLogs.map((log) => log.date));
    const done = tasks.filter((task) => task.status === 'done' && dates.has(task.deadline));
    const past = weekLogs.filter((log) => log.date <= today() && this.isCountable(log));
    const average = (key: 'sleepHours' | 'focusHours') => {
      const values = weekLogs
        .map((log) => log[key])
        .filter((value): value is number => typeof value === 'number');
      return values.length
        ? +(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
        : null;
    };
    return {
      week,
      days: weekLogs.length,
      avgScore: past.length
        ? Math.round(past.reduce((sum, log) => sum + log.score, 0) / past.length)
        : 0,
      hours: done.reduce((sum, task) => sum + (task.hours || 0), 0),
      tasksDone: done.length,
      sleepAvg: average('sleepHours'),
      focusAvg: average('focusHours'),
      daily: weekLogs.map((log) => {
        const dayTasks = tasks.filter((task) => task.deadline === log.date);
        return {
          day: log.day,
          date: log.date,
          score: log.score,
          hours: dayTasks
            .filter((task) => task.status === 'done')
            .reduce((sum, task) => sum + (task.hours || 0), 0),
          total: dayTasks.length,
          done: dayTasks.filter((task) => task.status === 'done').length,
        };
      }),
    };
  }

  weekday(date: string) {
    return WEEKDAY_NAMES[dayOfWeek(date)];
  }
}
