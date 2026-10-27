import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  GripVertical,
  Plus,
  Save,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { apiErrorMessage, todayDateOnly } from '../../lib/utils';
import { THEME_CONFIG } from '../../lib/theme-constants';
import { useToast } from '../../components/shared/toast-context';

type TaskStatus = 'todo' | 'doing' | 'done';
type TaskPriority = 'high' | 'medium' | 'low';
type SprintSection = 'overview' | 'tasks' | 'analytics' | 'log' | 'reviews' | 'setup';
type AnalyticsPeriod = 'day' | 'week' | 'weekend' | 'month' | 'sprint';

interface SprintTask {
  _id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  hours: number;
  notes: string;
}

interface SprintDayLog {
  _id: string;
  day: number;
  date: string;
  isWeekend: boolean;
  sleepHours?: number | null;
  focusHours?: number | null;
  focusVision?: string;
  accomplishments: string;
  obstacles: string;
  spendingAmount?: number | null;
  spendingNotes?: string;
  followUps?: string;
  tomorrowPriorities?: string[];
  score: number;
  taskCounts: { total: number; done: number; doing: number; todo: number };
}

interface SprintSettings {
  startDate: string;
  totalDays: number;
  weekendDays: number[];
}

interface SprintReview {
  _id: string;
  type: 'weekly' | 'final';
  week?: number;
  summary: string;
  change: string;
  tests: string;
  createdAt: string;
}

interface SprintStats {
  settings: SprintSettings | null;
  today: string;
  day: number;
  daysUntilStart: number;
  hours: number;
  tasksDone: number;
  tasksTotal: number;
  avgScore: number;
  streak: number;
  dailyScore: number;
  dailyLog: Pick<SprintDayLog, 'day' | 'date' | 'isWeekend' | 'sleepHours' | 'focusHours' | 'focusVision' | 'accomplishments' | 'obstacles' | 'spendingAmount' | 'spendingNotes' | 'followUps' | 'tomorrowPriorities'> | null;
  todayTasks: SprintTask[];
  upcoming: SprintTask[];
  sprintEndDate: string;
}

interface AnalyticsData {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  days: Array<{
    day: number;
    date: string;
    label: string;
    isWeekend: boolean;
    score: number;
    hours: number;
    total: number;
    done: number;
    doing: number;
    todo: number;
    sleepHours?: number | null;
    focusHours?: number | null;
  }>;
  metrics: {
    hours: number;
    tasksTotal: number;
    tasksDone: number;
    avgScore: number;
    activeDays: number;
    sleepAvg: number | null;
    focusAvg: number | null;
  };
}

interface WeekStats {
  week: number;
  avgScore: number;
  hours: number;
  tasksDone: number;
  sleepAvg: number | null;
  focusAvg: number | null;
  daily: Array<{ day: number; date: string; score: number; hours: number; total: number; done: number }>;
}

interface TaskForm {
  _id?: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  repeatMode: 'none' | 'until' | 'selected';
  repeatUntil: string;
  repeatDates: string[];
  repeatDateDraft: string;
  hours: number;
  notes: string;
}

type BulkTaskField = 'title' | 'status' | 'priority' | 'deadline' | 'hours' | 'notes';

type BulkTaskFields = Record<BulkTaskField, boolean>;

interface ReviewForm {
  _id?: string;
  type: 'weekly' | 'final';
  week: number;
  summary: string;
  change: string;
  tests: string;
}

const sections: Array<{ id: SprintSection; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', icon: Target },
  { id: 'tasks', label: 'Tasks', icon: Check },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'log', label: 'Daily log', icon: CalendarDays },
  { id: 'reviews', label: 'Reviews', icon: Activity },
  { id: 'setup', label: 'Sprint settings', icon: CalendarDays },
];
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const statuses: TaskStatus[] = ['todo', 'doing', 'done'];
const statusLabels: Record<TaskStatus, string> = { todo: 'To do', doing: 'In progress', done: 'Done' };
const priorityBadgeClasses: Record<TaskPriority, string> = {
  high: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300',
  medium: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300',
  low: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300',
};
const periods: Array<{ id: AnalyticsPeriod; label: string }> = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'weekend', label: 'Weekend' },
  { id: 'month', label: 'Month' },
  { id: 'sprint', label: 'Full sprint' },
];

const panelClass = `${THEME_CONFIG.surfaces.card} rounded-2xl p-5 shadow-sm`;
const inputClass = `w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition ${THEME_CONFIG.surfaces.input}`;
const taskSelectionCheckboxClass = 'h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-indigo-600 accent-indigo-600 transition focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-900 dark:accent-indigo-400 dark:focus:ring-offset-slate-900';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
const taskBlank = (deadline = todayDateOnly()): TaskForm => ({
  title: '',
  status: 'todo',
  priority: 'medium',
  deadline,
  repeatMode: 'none',
  repeatUntil: '',
  repeatDates: [],
  repeatDateDraft: '',
  hours: 1,
  notes: '',
});
const taskEditForm = (task: SprintTask): TaskForm => ({
  _id: task._id,
  title: task.title,
  status: task.status,
  priority: task.priority,
  deadline: task.deadline,
  repeatMode: 'none',
  repeatUntil: '',
  repeatDates: [],
  repeatDateDraft: '',
  hours: task.hours,
  notes: task.notes,
});
const reviewBlank = (week: number): ReviewForm => ({
  type: 'weekly',
  week,
  summary: '',
  change: '',
  tests: '',
});
const formatDay = (date: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00.000Z`));
const previousDate = (date: string) => {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() - 1);
  return result.toISOString().slice(0, 10);
};
const isOverdue = (task: SprintTask, today: string) =>
  task.status !== 'done' && Boolean(task.deadline) && task.deadline < today;

export const SprintTrackingScreen: React.FC = () => {
  const toast = useToast();
  const [section, setSection] = useState<SprintSection>('overview');
  const [settings, setSettings] = useState<SprintSettings | null>(null);
  const [stats, setStats] = useState<SprintStats | null>(null);
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [logs, setLogs] = useState<SprintDayLog[]>([]);
  const [reviews, setReviews] = useState<SprintReview[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [reviewWeekStats, setReviewWeekStats] = useState<WeekStats | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>('week');
  const [analyticsWeek, setAnalyticsWeek] = useState<number | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm | null>(null);
  const [bulkTaskForm, setBulkTaskForm] = useState<TaskForm | null>(null);
  const [bulkTaskFields, setBulkTaskFields] = useState<BulkTaskFields>({
    title: false,
    status: false,
    priority: false,
    deadline: false,
    hours: false,
    notes: false,
  });
  const [viewingTask, setViewingTask] = useState<SprintTask | null>(null);
  const [taskLayout, setTaskLayout] = useState<'board' | 'list'>('list');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<TaskStatus | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm | null>(null);
  const [selectedLog, setSelectedLog] = useState<SprintDayLog | null>(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('');
  const [taskFrom, setTaskFrom] = useState('');
  const [taskTo, setTaskTo] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [setupDate, setSetupDate] = useState(todayDateOnly());
  const [startDateDraft, setStartDateDraft] = useState('');
  const [setupDays, setSetupDays] = useState(40);
  const [setupWeekends, setSetupWeekends] = useState<number[]>([5, 6]);
  const [starterTasks, setStarterTasks] = useState('');
  const [extendDays, setExtendDays] = useState(15);
  const reviewWeek = reviewForm?.type === 'weekly' ? reviewForm.week : null;
  const displayedReviewWeekStats =
    reviewWeek != null && reviewWeekStats?.week === reviewWeek ? reviewWeekStats : null;

  const load = useCallback(async () => {
    try {
      const settingsResponse = await api.get<SprintSettings | null>('/sprint/settings');
      setSettings(settingsResponse.data);
      setError(null);
      if (!settingsResponse.data) {
        setStartDateDraft('');
        setStats(null);
        setTasks([]);
        setLogs([]);
        setReviews([]);
        return;
      }
      setStartDateDraft((current) => current || settingsResponse.data!.startDate);
      const [statsResponse, tasksResponse, logsResponse, reviewsResponse] = await Promise.all([
        api.get<SprintStats>('/sprint/stats'),
        api.get<SprintTask[]>('/sprint/tasks'),
        api.get<SprintDayLog[]>('/sprint/logs'),
        api.get<SprintReview[]>('/sprint/reviews'),
      ]);
      setStats(statsResponse.data);
      setTasks(tasksResponse.data);
      setLogs(logsResponse.data);
      setReviews(reviewsResponse.data);
    } catch (requestError) {
      const message = apiErrorMessage(requestError, 'Could not load sprint data.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const sprintWeekCount = Math.max(1, Math.ceil((settings?.totalDays ?? 1) / 7));
  const currentSprintWeek = stats
    ? Math.min(
        sprintWeekCount,
        stats.day
          ? Math.max(1, Math.ceil(stats.day / 7))
          : stats.today > stats.sprintEndDate
            ? sprintWeekCount
            : 1,
      )
    : 1;
  const selectedAnalyticsWeek = Math.min(analyticsWeek ?? currentSprintWeek, sprintWeekCount);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (section !== 'analytics' || !settings) return;
    let cancelled = false;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    setAnalytics(null);
    const weekQuery = period === 'week' ? `&week=${selectedAnalyticsWeek}` : '';
    api.get<AnalyticsData>(`/sprint/analytics?period=${period}${weekQuery}`)
      .then((response) => {
        if (!cancelled) {
          setAnalytics(response.data);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          const message = apiErrorMessage(requestError, 'Could not load sprint analytics.');
          setAnalyticsError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, section, selectedAnalyticsWeek, settings, toast]);

  useEffect(() => {
    if (reviewWeek == null) return;
    let cancelled = false;
    api.get<WeekStats>(`/sprint/stats/week/${reviewWeek}`)
      .then((response) => {
        if (!cancelled) setReviewWeekStats(response.data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          toast.error(apiErrorMessage(requestError, 'Could not load weekly review statistics.'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reviewWeek, toast]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(taskSearch.toLowerCase());
    return matchesSearch &&
      (!taskStatusFilter || task.status === taskStatusFilter) &&
      (!taskPriorityFilter || task.priority === taskPriorityFilter) &&
      (!taskFrom || task.deadline >= taskFrom) &&
      (!taskTo || task.deadline <= taskTo);
  }), [taskFrom, taskPriorityFilter, taskSearch, taskStatusFilter, taskTo, tasks]);
  const bestCompletionDay = analytics?.days
    .filter((day) => day.total > 0)
    .sort((left, right) => right.score - left.score || right.done - left.done)[0];
  const bestHoursDay = analytics?.days
    .filter((day) => day.hours > 0)
    .sort((left, right) => right.hours - left.hours)[0];
  const loggedDays = logs.filter(
    (log) =>
      log.accomplishments ||
      log.obstacles ||
      log.focusVision ||
      log.sleepHours != null ||
      log.focusHours != null ||
      log.spendingAmount != null ||
      log.spendingNotes ||
      log.followUps ||
      log.tomorrowPriorities?.some((priority) => priority.trim()) ||
      log.taskCounts.total > 0,
  ).length;
  const countableLogs = logs.filter(
    (log) => log.taskCounts.total > 0 && !(log.isWeekend && log.score === 0),
  );
  const logAverage = countableLogs.length
    ? Math.round(countableLogs.reduce((sum, log) => sum + log.score, 0) / countableLogs.length)
    : 0;
  const logTasksDone = logs.reduce((sum, log) => sum + log.taskCounts.done, 0);
  const selectedDayTasks = selectedLog
    ? tasks.filter((task) => task.deadline === selectedLog.date)
    : [];
  const currentViewedTask = viewingTask
    ? tasks.find((task) => task._id === viewingTask._id) ?? viewingTask
    : null;
  const yesterdayTasks = stats
    ? tasks.filter((task) => task.deadline === previousDate(stats.today) && task.status !== 'done')
    : [];
  const overdueTasks = stats ? tasks.filter((task) => isOverdue(task, stats.today)) : [];

  const request = async (action: () => Promise<unknown>, successMessage?: string) => {
    setSaving(true);
    try {
      await action();
      if (successMessage) toast.success(successMessage);
      await load();
      return true;
    } catch (requestError) {
      toast.error(apiErrorMessage(requestError, 'The change could not be saved.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    const names = starterTasks.split('\n').map((task) => task.trim()).filter(Boolean);
    if (names.length > 100 || names.some((task) => task.length > 120)) {
      toast.error('Add up to 100 starter tasks, each no longer than 120 characters.');
      return;
    }
    const complete = await request(
      () => api.post('/sprint/settings', {
        startDate: setupDate,
        totalDays: Number(setupDays),
        weekendDays: setupWeekends,
        tasks: names,
      }),
      'Your sprint is ready.',
    );
    if (complete) setSection('overview');
  };

  const extendSprint = async (event: React.FormEvent) => {
    event.preventDefault();
    await request(
      () => api.post('/sprint/settings/extend', { days: Number(extendDays) }),
      `Sprint extended by ${extendDays} days.`,
    );
  };

  const updateSprintStartDate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings || !startDateDraft || startDateDraft === settings.startDate) return;
    if (!window.confirm(
      `Move Day 1 from ${formatDay(settings.startDate)} to ${formatDay(startDateDraft)}? This shifts every sprint day, daily log date, and scheduled task date by the same amount.`,
    )) return;

    const complete = await request(
      () => api.patch('/sprint/settings/start-date', { startDate: startDateDraft }),
      'Sprint dates and scheduled task dates updated.',
    );
    if (complete) setStartDateDraft(startDateDraft);
  };

  const startNewSprint = async () => {
    if (!window.confirm('Start a new sprint? This permanently removes the current sprint’s tasks, daily logs, and reviews.')) {
      return;
    }
    const complete = await request(
      () => api.delete('/sprint/settings'),
      'Current sprint removed. Set up your new sprint below.',
    );
    if (complete) {
      setSetupDate(todayDateOnly());
      setStartDateDraft('');
      setSetupDays(40);
      setSetupWeekends([5, 6]);
      setStarterTasks('');
      setSection('overview');
    }
  };

  const saveTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!taskForm) return;
    const { repeatMode, repeatUntil, _id } = taskForm;
    const fields = {
      title: taskForm.title,
      status: taskForm.status,
      priority: taskForm.priority,
      deadline: taskForm.deadline,
      hours: taskForm.hours,
      notes: taskForm.notes,
    };
    if (!_id && repeatMode === 'until') {
      if (!repeatUntil) {
        toast.error('Choose a date to repeat the task until.');
        return;
      }
      if (repeatUntil < fields.deadline) {
        toast.error('The final repeat date must be on or after the first date.');
        return;
      }
      const dates: string[] = [];
      const cursor = new Date(`${fields.deadline}T00:00:00.000Z`);
      const finalDate = new Date(`${repeatUntil}T00:00:00.000Z`);
      while (cursor <= finalDate && dates.length <= 90) {
        dates.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      if (dates.length > 90) {
        toast.error('A repeated task can span at most 90 days.');
        return;
      }
      const complete = await request(
        () => api.post('/sprint/tasks', { ...fields, dates }),
        'Task added to your sprint.',
      );
      if (complete) setTaskForm(null);
      return;
    }
    if (!_id && repeatMode === 'selected') {
      const dates = [...new Set([fields.deadline, ...taskForm.repeatDates])].sort();
      if (dates.length > 90) {
        toast.error('A repeated task can have at most 90 selected dates.');
        return;
      }
      const complete = await request(
        () => api.post('/sprint/tasks', { ...fields, dates }),
        `${dates.length} task${dates.length === 1 ? '' : 's'} added to your sprint.`,
      );
      if (complete) setTaskForm(null);
      return;
    }
    const complete = await request(
      () => _id
        ? api.patch(`/sprint/tasks/${_id}`, fields)
        : api.post('/sprint/tasks', fields),
      _id ? 'Task updated.' : 'Task added to your sprint.',
    );
    if (complete) setTaskForm(null);
  };

  const changeTaskStatus = async (task: SprintTask, direction = 1) => {
    const next = statuses[statuses.indexOf(task.status) + direction];
    if (!next) return;
    await moveTaskToStatus(task, next);
  };

  const moveTaskToStatus = async (task: SprintTask, status: TaskStatus) => {
    if (task.status === status) return;
    await request(
      () => api.patch(`/sprint/tasks/${task._id}`, { status }),
      `Task moved to ${statusLabels[status].toLowerCase()}.`,
    );
  };

  const handleTaskDrop = (event: React.DragEvent<HTMLElement>, status: TaskStatus) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setDropTargetStatus(null);
    const task = tasks.find((item) => item._id === taskId);
    if (task) void moveTaskToStatus(task, status);
  };

  const moveTaskToToday = async (task: SprintTask) => {
    if (!stats) return;
    await request(
      () => api.patch(`/sprint/tasks/${task._id}`, { deadline: stats.today }),
      `"${task.title}" moved to today.`,
    );
  };

  const deleteTask = async (task: SprintTask) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    await request(() => api.delete(`/sprint/tasks/${task._id}`), 'Task deleted.');
  };

  const bulkDeleteTasks = async () => {
    if (
      !selectedTaskIds.length ||
      !window.confirm(`Delete ${selectedTaskIds.length} selected task${selectedTaskIds.length === 1 ? '' : 's'}? This cannot be undone.`)
    ) return;
    const complete = await request(
      () => api.post('/sprint/tasks/bulk-delete', { ids: selectedTaskIds }),
      `${selectedTaskIds.length} task${selectedTaskIds.length === 1 ? '' : 's'} deleted.`,
    );
    if (complete) setSelectedTaskIds([]);
  };

  const openBulkTaskEditor = () => {
    const firstSelectedTask = tasks.find((task) => selectedTaskIds.includes(task._id));
    if (!firstSelectedTask) {
      toast.error('Select at least one task to update.');
      return;
    }

    setBulkTaskForm(taskEditForm(firstSelectedTask));
    setBulkTaskFields({
      title: false,
      status: false,
      priority: false,
      deadline: false,
      hours: false,
      notes: false,
    });
  };

  const saveBulkTaskUpdates = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bulkTaskForm) return;
    if (bulkTaskFields.title && !bulkTaskForm.title.trim()) {
      toast.error('Task title cannot be empty.');
      return;
    }
    if (bulkTaskFields.deadline && !bulkTaskForm.deadline) {
      toast.error('Choose a scheduled date to apply.');
      return;
    }
    const update = Object.fromEntries(
      (Object.keys(bulkTaskFields) as BulkTaskField[])
        .filter((field) => bulkTaskFields[field])
        .map((field) => [
          field,
          field === 'title' ? bulkTaskForm.title.trim() : bulkTaskForm[field],
        ]),
    ) as Partial<Pick<SprintTask, BulkTaskField>>;
    const fieldsToUpdate = Object.keys(update) as BulkTaskField[];
    if (!fieldsToUpdate.length) {
      toast.error('Choose at least one field to apply to the selected tasks.');
      return;
    }

    const selectedTasks = tasks.filter((task) => selectedTaskIds.includes(task._id));
    if (!selectedTasks.length) {
      toast.error('No selected tasks were found. Select the tasks again and retry.');
      setBulkTaskForm(null);
      setSelectedTaskIds([]);
      return;
    }

    setSaving(true);
    const results = await Promise.allSettled(
      selectedTasks.map((task) => api.patch(`/sprint/tasks/${task._id}`, update)),
    );
    const updatedIds = selectedTasks
      .filter((_, index) => results[index].status === 'fulfilled')
      .map((task) => task._id);
    const failedTasks = selectedTasks.filter((_, index) => results[index].status === 'rejected');
    const failedCount = failedTasks.length;
    setSelectedTaskIds((current) => current.filter((id) => !updatedIds.includes(id)));

    try {
      await load();
    } finally {
      setSaving(false);
    }

    if (failedCount) {
      toast.error(`${updatedIds.length} task${updatedIds.length === 1 ? '' : 's'} updated; ${failedCount} could not be updated. Failed tasks remain selected.`);
    } else {
      toast.success(`${updatedIds.length} selected task${updatedIds.length === 1 ? '' : 's'} updated.`);
      setBulkTaskForm(null);
    }
  };

  const saveLog = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLog) return;
    const complete = await request(
      () => api.put(`/sprint/logs/${selectedLog.day}`, {
        sleepHours: selectedLog.sleepHours,
        focusHours: selectedLog.focusHours,
        focusVision: selectedLog.focusVision,
        accomplishments: selectedLog.accomplishments,
        obstacles: selectedLog.obstacles,
        spendingAmount: selectedLog.spendingAmount ?? null,
        spendingNotes: selectedLog.spendingNotes ?? '',
        followUps: selectedLog.followUps ?? '',
        tomorrowPriorities: (selectedLog.tomorrowPriorities ?? [])
          .map((priority) => priority.trim())
          .filter(Boolean)
          .slice(0, 3),
      }),
      `Day ${selectedLog.day} saved.`,
    );
    if (complete) setSelectedLog(null);
  };

  const saveReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewForm) return;
    const { _id, type, week, summary, change, tests } = reviewForm;
    const body = type === 'weekly'
      ? { type, week, summary, change, tests }
      : { type, summary, change, tests };
    const complete = await request(
      () => _id
        ? api.put(`/sprint/reviews/${_id}`, body)
        : api.post('/sprint/reviews', body),
      _id ? 'Review updated.' : 'Review saved.',
    );
    if (complete) setReviewForm(null);
  };

  const deleteReview = async () => {
    if (!reviewForm?._id || !window.confirm('Delete this review?')) return;
    const complete = await request(
      () => api.delete(`/sprint/reviews/${reviewForm._id}`),
      'Review deleted.',
    );
    if (complete) setReviewForm(null);
  };

  if (loading && !settings && !error) {
    return <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">Loading sprint workspace…</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-indigo-500">Personal progress</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sprint tracker</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Plan work, reflect on each day, and follow your progress.
          </p>
        </div>
        {settings && (
          <button type="button" className={buttonClass} onClick={() => setTaskForm(taskBlank(stats?.today))}>
            <Plus className="h-4 w-4" /> Add task
          </button>
        )}
      </header>

      {settings && (
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Sprint sections">
          {sections.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setSection(item.id)}
                aria-current={section === item.id ? 'page' : undefined}
                className={`inline-flex items-center justify-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                  section === item.id
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'border-slate-200/80 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />{item.label}
              </button>
            );
          })}
        </nav>
      )}

      {!settings ? (
        error ? (
          <section className={`${panelClass} mx-auto max-w-3xl text-center`}>
            <h2 className="font-semibold text-slate-900 dark:text-white">Sprint data is unavailable</h2>
            <p className="mt-2 text-sm text-slate-500">Retry loading before creating or changing a sprint.</p>
            <button type="button" className={`${buttonClass} mt-4`} onClick={() => { setError(null); setLoading(true); void load(); }}>
              Retry
            </button>
          </section>
        ) : (
        <section className={`${panelClass} mx-auto max-w-3xl`}>
          <div className="mb-6 flex items-start gap-4">
            <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"><Target className="h-6 w-6" /></span>
            <div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Set up your first sprint</h2><p className="mt-1 text-sm text-slate-500">Choose a start date, sprint length, rest days, and optional starter tasks.</p></div>
          </div>
          <form onSubmit={saveSettings} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium">Sprint starts<input className={inputClass} type="date" required value={setupDate} onChange={(event) => setSetupDate(event.target.value)} /></label>
              <label className="space-y-1.5 text-sm font-medium">Sprint length in days<input className={inputClass} type="number" min="1" max="365" required value={setupDays} onChange={(event) => setSetupDays(Number(event.target.value))} /></label>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Rest days</legend>
              <p className="mb-3 text-xs text-slate-500">Choose which weekdays should be marked as weekends.</p>
              <div className="flex flex-wrap gap-2">
                {weekdays.map((day, index) => {
                  const selected = setupWeekends.includes(index);
                  return <button type="button" key={day} aria-pressed={selected} onClick={() => setSetupWeekends((current) => selected ? current.filter((value) => value !== index) : [...current, index])} className={`rounded-xl border px-3 py-2 text-xs font-medium ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>{day.slice(0, 3)}</button>;
                })}
              </div>
            </fieldset>
            <label className="block space-y-1.5 text-sm font-medium">Starter tasks <span className="font-normal text-slate-400">(optional, one per line)</span><textarea className={`${inputClass} min-h-28 resize-y`} placeholder={'Read 10 pages\nGo for a walk'} value={starterTasks} onChange={(event) => setStarterTasks(event.target.value)} /></label>
            <button className={buttonClass} disabled={saving}><CalendarDays className="h-4 w-4" />{saving ? 'Setting up…' : 'Create sprint'}</button>
          </form>
        </section>
        )
      ) : (
        <>
          {section === 'overview' && stats && (
            <div className="space-y-5">
              <section className={`${panelClass} flex flex-col justify-between gap-5 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-900 sm:flex-row sm:items-center`}>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Sprint overview</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.day ? `Day ${stats.day} of ${settings?.totalDays}` : stats.daysUntilStart ? `Starts in ${stats.daysUntilStart} day${stats.daysUntilStart === 1 ? '' : 's'}` : 'Sprint complete'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{settings && `${formatDay(settings.startDate)} – ${formatDay(stats.sprintEndDate)}`}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-2 max-w-sm flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${settings ? Math.min(100, Math.round((stats.day / settings.totalDays) * 100)) : 0}%` }} /></div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{settings ? `${Math.min(100, Math.round((stats.day / settings.totalDays) * 100))}%` : '0%'}</span>
                  </div>
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Hours completed', value: `${Math.round(stats.hours * 10) / 10}h`, icon: Clock3, tone: 'text-violet-500' },
                  { label: 'Tasks completed', value: `${stats.tasksDone}/${stats.tasksTotal}`, icon: Check, tone: 'text-emerald-500' },
                  { label: 'Average completion', value: `${stats.avgScore}%`, icon: BarChart3, tone: 'text-indigo-500' },
                  { label: 'Current streak', value: `${stats.streak} day${stats.streak === 1 ? '' : 's'}`, icon: Flame, tone: 'text-amber-500' },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return <article key={stat.label} className={panelClass}><Icon className={`mb-3 h-5 w-5 ${stat.tone}`} /><p className="text-xs text-slate-500">{stat.label}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p></article>;
                })}
              </div>

              <section className={panelClass}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900 dark:text-white">Today’s tasks</h3><p className="mt-1 text-xs text-slate-500">Move work through the board as you make progress.</p></div><button type="button" className={secondaryButtonClass} onClick={() => setTaskForm(taskBlank(stats.today))}><Plus className="h-4 w-4" /> Add task</button></div>
                <div className="grid gap-3 md:grid-cols-3">
                  {statuses.map((status) => {
                    const list = stats.todayTasks.filter((task) => task.status === status);
                    return (
                      <div
                        key={status}
                        className={`min-h-32 rounded-xl p-3 transition-colors ${dropTargetStatus === status ? 'bg-indigo-100 ring-2 ring-indigo-400 dark:bg-indigo-950/50' : 'bg-slate-50 dark:bg-slate-950/60'}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDragEnter={() => setDropTargetStatus(status)}
                        onDragLeave={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                            setDropTargetStatus(null);
                          }
                        }}
                        onDrop={(event) => handleTaskDrop(event, status)}
                        aria-label={`Drop tasks in ${statusLabels[status]}`}
                      >
                        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {statusLabels[status]}
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-900">{list.length}</span>
                        </div>
                        {list.map((task) => (
                          <article
                            key={task._id}
                            draggable={!saving}
                            onDragStart={(event) => {
                              event.dataTransfer.setData('text/plain', task._id);
                              event.dataTransfer.effectAllowed = 'move';
                              setDraggedTaskId(task._id);
                            }}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setDropTargetStatus(null);
                            }}
                            className={`mb-2 rounded-xl border border-slate-200 bg-white p-3 transition dark:border-slate-800 dark:bg-slate-900 ${draggedTaskId === task._id ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-start gap-2">
                              <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-slate-400" aria-hidden="true" />
                              <button
                                type="button"
                                className="min-w-0 flex-1 text-left text-sm font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-100"
                                onClick={() => setViewingTask(task)}
                              >
                                {task.title}
                              </button>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" title="Estimated time">
                                <Clock3 className="h-3 w-3" aria-hidden="true" />
                                {task.hours}h
                              </span>
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityBadgeClasses[task.priority]}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                                {task.priority}
                              </span>
                              <div className="flex gap-1">
                                <button type="button" aria-label={`Move ${task.title} backward`} className="rounded-md px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800" disabled={status === 'todo' || saving} onClick={() => void changeTaskStatus(task, -1)}><ChevronLeft className="h-4 w-4" /></button>
                                <button type="button" aria-label={`Move ${task.title} forward`} className="rounded-md px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800" disabled={status === 'done' || saving} onClick={() => void changeTaskStatus(task)}><ChevronRight className="h-4 w-4" /></button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    );
                  })}
                </div>
                {!stats.todayTasks.length && <p className="mt-4 text-center text-sm text-slate-500">No tasks scheduled for today yet.</p>}
              </section>

              {yesterdayTasks.length > 0 && (
                <section className={`${panelClass} border border-amber-200 dark:border-amber-900/60`}>
                  <div className="mb-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Unfinished from yesterday</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {yesterdayTasks.length} task{yesterdayTasks.length === 1 ? ' needs' : 's need'} attention from {formatDay(previousDate(stats.today))}.
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {yesterdayTasks.map((task) => (
                      <li key={task._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                        <div className="min-w-0 flex-1">
                          <button type="button" className="block max-w-full truncate text-left text-sm font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-100" onClick={() => setViewingTask(task)}>
                            {task.title}
                          </button>
                          <p className="mt-1 text-xs text-slate-500">{task.hours}h estimated · {statusLabels[task.status]}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={secondaryButtonClass} onClick={() => void moveTaskToToday(task)} disabled={saving}>
                            Move to today
                          </button>
                          <button type="button" className="rounded-xl px-3.5 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30" onClick={() => void request(() => api.patch(`/sprint/tasks/${task._id}`, { status: 'done' }), `"${task.title}" marked done.`)} disabled={saving}>
                            Mark done
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {overdueTasks.length > 0 && (
                <section
                  className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/25"
                  role="status"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-rose-800 dark:text-rose-200">
                        {overdueTasks.length} overdue task{overdueTasks.length === 1 ? '' : 's'}
                      </h3>
                      <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
                        These incomplete tasks are past their scheduled date. Review them in the task board.
                      </p>
                      <ul className="mt-2 space-y-1">
                        {overdueTasks.slice(0, 3).map((task) => (
                          <li key={task._id} className="flex flex-wrap items-center gap-x-2 text-xs text-rose-700 dark:text-rose-300">
                            <button type="button" className="max-w-full truncate font-medium underline decoration-rose-300 underline-offset-2" onClick={() => setViewingTask(task)}>
                              {task.title}
                            </button>
                            <span>· Due {formatDay(task.deadline)}</span>
                          </li>
                        ))}
                        {overdueTasks.length > 3 && (
                          <li className="text-xs text-rose-700 dark:text-rose-300">
                            and {overdueTasks.length - 3} more
                          </li>
                        )}
                      </ul>
                    </div>
                    <button type="button" className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 dark:text-rose-200 dark:hover:bg-rose-900/40" onClick={() => setSection('tasks')}>
                      View tasks
                    </button>
                  </div>
                </section>
              )}

              <div className="grid gap-5 lg:grid-cols-2">
                <section className={panelClass}>
                  <div className="mb-3 flex items-center justify-between">
                    <div><h3 className="font-semibold text-slate-900 dark:text-white">Daily review</h3><p className="mt-1 text-xs text-slate-500">{stats.dailyLog ? `Day ${stats.dailyLog.day}` : 'Review progress and prepare for tomorrow.'}</p></div>
                    <button type="button" className={secondaryButtonClass} onClick={() => { const log = logs.find((item) => item.date === stats.today); if (log) setSelectedLog(log); else setSection('log'); }}>Open review</button>
                  </div>
                  {stats.dailyLog?.focusVision && <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 dark:border-indigo-500/20 dark:bg-indigo-500/10"><p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Today’s focus / vision</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{stats.dailyLog.focusVision}</p></div>}
                  <p className="min-h-10 text-sm text-slate-600 dark:text-slate-300">{stats.dailyLog?.accomplishments || 'Record completed work, blockers, spending, and follow-ups.'}</p>
                  {stats.dailyLog?.tomorrowPriorities?.some((priority) => priority.trim()) && <div className="mt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Tomorrow’s priorities</p><ol className="mt-1 list-inside list-decimal space-y-1 text-sm text-slate-700 dark:text-slate-300">{stats.dailyLog.tomorrowPriorities.filter((priority) => priority.trim()).map((priority, index) => <li key={`${index}-${priority}`}>{priority}</li>)}</ol></div>}
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800"><span><b className="text-slate-800 dark:text-slate-100">{stats.dailyLog?.sleepHours ?? '–'}h</b><span className="ml-1 text-slate-500">sleep</span></span><span><b className="text-slate-800 dark:text-slate-100">{stats.dailyLog?.focusHours ?? '–'}h</b><span className="ml-1 text-slate-500">focus</span></span><span><b className="text-slate-800 dark:text-slate-100">{stats.dailyScore}%</b><span className="ml-1 text-slate-500">tasks done</span></span>{stats.dailyLog?.spendingAmount != null && <span><b className="text-slate-800 dark:text-slate-100">{stats.dailyLog.spendingAmount}</b><span className="ml-1 text-slate-500">spent today</span></span>}</div>
                  {stats.dailyLog?.spendingNotes && <p className="mt-2 text-xs text-slate-500"><span className="font-semibold text-slate-700 dark:text-slate-300">Spending notes: </span>{stats.dailyLog.spendingNotes}</p>}
                  {stats.dailyLog?.followUps && <p className="mt-3 text-xs text-slate-500"><span className="font-semibold text-slate-700 dark:text-slate-300">Follow-ups: </span>{stats.dailyLog.followUps}</p>}
                </section>
                <section className={panelClass}><h3 className="font-semibold text-slate-900 dark:text-white">Coming up</h3>{stats.upcoming.length ? <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{stats.upcoming.map((task) => <li key={task._id} className="flex items-center justify-between gap-3 py-2.5"><span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{task.title}</span><span className="shrink-0 text-xs text-slate-500">{formatDay(task.deadline)} · {task.hours}h</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Nothing scheduled ahead. Add a task to plan your next step.</p>}</section>
              </div>
            </div>
          )}

          {section === 'tasks' && (
            <section className={`${panelClass} space-y-3 !p-4 sm:!p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Sprint tasks</h2>
                  <span className="text-xs text-slate-500">{filteredTasks.length} shown</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-950" role="group" aria-label="Task view">
                    <button type="button" aria-pressed={taskLayout === 'board'} className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${taskLayout === 'board' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-500'}`} onClick={() => setTaskLayout('board')}>Board</button>
                    <button type="button" aria-pressed={taskLayout === 'list'} className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${taskLayout === 'list' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-500'}`} onClick={() => setTaskLayout('list')}>List</button>
                  </div>
                  <button type="button" className={`${buttonClass} px-3 py-2 text-xs`} onClick={() => setTaskForm(taskBlank(stats?.today))}><Plus className="h-3.5 w-3.5" /> New task</button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-950/50">
                <input aria-label="Search tasks" className={`${inputClass} min-w-40 flex-[2] py-2 text-xs`} type="search" placeholder="Search tasks…" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} />
                <select aria-label="Filter by status" className={`${inputClass} min-w-32 flex-1 py-2 text-xs`} value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value)}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
                <select aria-label="Filter by priority" className={`${inputClass} min-w-32 flex-1 py-2 text-xs`} value={taskPriorityFilter} onChange={(event) => setTaskPriorityFilter(event.target.value)}><option value="">All priorities</option>{(['high', 'medium', 'low'] as const).map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select>
                <div className="flex min-w-0 flex-[2] items-center gap-1.5">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Due</span>
                  <input aria-label="Tasks from date" className={`${inputClass} min-w-0 flex-1 px-2 py-2 text-xs`} type="date" value={taskFrom} onChange={(event) => setTaskFrom(event.target.value)} />
                  <span className="text-xs text-slate-400">–</span>
                  <input aria-label="Tasks through date" className={`${inputClass} min-w-0 flex-1 px-2 py-2 text-xs`} type="date" value={taskTo} onChange={(event) => setTaskTo(event.target.value)} />
                </div>
                {(taskSearch || taskStatusFilter || taskPriorityFilter || taskFrom || taskTo) && <button type="button" className="rounded-lg px-2.5 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40" onClick={() => { setTaskSearch(''); setTaskStatusFilter(''); setTaskPriorityFilter(''); setTaskFrom(''); setTaskTo(''); }}>Reset</button>}
              </div>
              {selectedTaskIds.length > 0 && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 dark:border-indigo-900/50 dark:bg-indigo-950/20"><span className="text-xs font-medium text-indigo-800 dark:text-indigo-200">{selectedTaskIds.length} selected</span><div className="flex flex-wrap items-center gap-1.5"><button type="button" disabled={saving} className={`${buttonClass} px-3 py-1.5 text-xs`} onClick={openBulkTaskEditor}><Activity className="h-3.5 w-3.5" />Update all</button><button type="button" disabled={saving} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50 dark:hover:bg-rose-950/30" onClick={() => void bulkDeleteTasks()}><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete</button><button type="button" disabled={saving} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-white disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => setSelectedTaskIds([])}>Clear</button></div></div>}
              {overdueTasks.length > 0 && !taskFrom && !taskTo && !taskStatusFilter && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{overdueTasks.length} incomplete task{overdueTasks.length === 1 ? ' is' : 's are'} past the due date. Overdue tasks are marked below.</p>
                </div>
              )}
              {taskLayout === 'board' ? (
                <div className="grid gap-4 xl:grid-cols-3">
                  {statuses.map((status) => {
                    const columnTasks = filteredTasks.filter((task) => task.status === status);
                    return (
                      <section
                        key={status}
                        aria-label={`${statusLabels[status]} tasks`}
                        className={`min-h-64 rounded-2xl border p-3 transition-colors ${dropTargetStatus === status ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40'}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDragEnter={() => setDropTargetStatus(status)}
                        onDragLeave={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                            setDropTargetStatus(null);
                          }
                        }}
                        onDrop={(event) => handleTaskDrop(event, status)}
                      >
                        <header className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{statusLabels[status]}</h3>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-900">{columnTasks.length}</span>
                        </header>
                        <div className="space-y-2">
                          {columnTasks.map((task) => (
                            <article
                              key={task._id}
                              draggable={!saving}
                              onDragStart={(event) => {
                                event.dataTransfer.setData('text/plain', task._id);
                                event.dataTransfer.effectAllowed = 'move';
                                setDraggedTaskId(task._id);
                              }}
                              onDragEnd={() => {
                                setDraggedTaskId(null);
                                setDropTargetStatus(null);
                              }}
                              className={`mb-2 rounded-xl border bg-white p-3 transition dark:bg-slate-900 ${isOverdue(task, stats?.today ?? todayDateOnly()) ? 'border-rose-300 dark:border-rose-900' : 'border-slate-200 dark:border-slate-800'} ${draggedTaskId === task._id ? 'opacity-50' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${task.title}`}
                                  checked={selectedTaskIds.includes(task._id)}
                                  onChange={(event) => setSelectedTaskIds((current) => event.target.checked ? [...current, task._id] : current.filter((id) => id !== task._id))}
                                  onClick={(event) => event.stopPropagation()}
                                  className={`${taskSelectionCheckboxClass} mt-1`}
                                />
                                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-slate-400" aria-hidden="true" />
                                <button
                                  type="button"
                                  className="min-w-0 flex-1 text-left text-sm font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-100"
                                  onClick={() => setViewingTask(task)}
                                >
                                  {task.title}
                                </button>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" title="Estimated time">
                                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                                  {task.hours}h
                                </span>
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityBadgeClasses[task.priority]}`}>
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                                  {task.priority}
                                </span>
                                {isOverdue(task, stats?.today ?? todayDateOnly()) && (
                                  <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Overdue · {formatDay(task.deadline)}
                                  </span>
                                )}
                                <div className="flex gap-1">
                                  <button type="button" aria-label={`Move ${task.title} backward`} className="rounded-md px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800" disabled={status === 'todo' || saving} onClick={() => void changeTaskStatus(task, -1)}><ChevronLeft className="h-4 w-4" /></button>
                                  <button type="button" aria-label={`Move ${task.title} forward`} className="rounded-md px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800" disabled={status === 'done' || saving} onClick={() => void changeTaskStatus(task)}><ChevronRight className="h-4 w-4" /></button>
                                </div>
                              </div>
                              {task.deadline && <p className="mt-1 text-[11px] text-slate-400">{formatDay(task.deadline)}</p>}
                            </article>
                          ))}
                          {!columnTasks.length && <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-500 dark:border-slate-700">Drop a task here</p>}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="text-xs text-slate-500"><tr><th className="px-3 py-2 font-medium"><input className={taskSelectionCheckboxClass} type="checkbox" aria-label="Select all visible tasks" checked={filteredTasks.length > 0 && filteredTasks.every((task) => selectedTaskIds.includes(task._id))} onChange={(event) => setSelectedTaskIds(event.target.checked ? filteredTasks.map((task) => task._id) : [])} /></th><th className="px-3 py-2 font-medium">Task</th><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Estimate</th><th className="px-3 py-2 font-medium">Priority</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Actions</th></tr></thead>
                  <tbody>{filteredTasks.map((task) => {
                    const selected = selectedTaskIds.includes(task._id);
                    const overdue = isOverdue(task, stats?.today ?? todayDateOnly());
                    return <tr key={task._id} className={`border-t transition-colors ${selected ? 'bg-indigo-50/70 dark:bg-indigo-950/25' : overdue ? 'bg-rose-50/60 dark:bg-rose-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'} ${overdue ? 'border-rose-200 dark:border-rose-950' : 'border-slate-100 dark:border-slate-800'}`}><td className="px-3 py-3"><input className={taskSelectionCheckboxClass} type="checkbox" aria-label={`Select ${task.title}`} checked={selected} onChange={(event) => setSelectedTaskIds((current) => event.target.checked ? [...current, task._id] : current.filter((id) => id !== task._id))} /></td><td className="max-w-64 px-3 py-3"><button type="button" className="truncate text-left font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-100" onClick={() => setViewingTask(task)}>{task.title}</button>{task.notes && <p className="mt-1 truncate text-xs text-slate-500">{task.notes}</p>}</td><td className={`px-3 py-3 ${overdue ? 'font-semibold text-rose-700 dark:text-rose-300' : 'text-slate-500'}`}>{task.deadline ? <span className="inline-flex items-center gap-1.5">{overdue && <AlertTriangle className="h-3.5 w-3.5" />}{formatDay(task.deadline)}{overdue && <span className="text-[10px] uppercase">Overdue</span>}</span> : '—'}</td><td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" title="Estimated time"><Clock3 className="h-3 w-3" aria-hidden="true" />{task.hours}h</span></td><td className="px-3 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityBadgeClasses[task.priority]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{task.priority}</span></td><td className="px-3 py-3"><button type="button" className={`rounded-full px-2.5 py-1 text-xs font-semibold ${task.status === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : task.status === 'doing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`} onClick={() => void changeTaskStatus(task)}>{statusLabels[task.status]}</button></td><td className="px-3 py-3"><div className="flex gap-1"><button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={`Edit ${task.title}`} onClick={() => setTaskForm(taskEditForm(task))}><Activity className="h-4 w-4" /></button><button type="button" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" aria-label={`Delete ${task.title}`} onClick={() => void deleteTask(task)}><Trash2 className="h-4 w-4" /></button></div></td></tr>;
                  })}</tbody>
                </table>
              </div>
              )}
              {!filteredTasks.length && <p className="py-8 text-center text-sm text-slate-500">No tasks match. Clear filters or add a task.</p>}
            </section>
          )}

          {section === 'analytics' && (
            <div className="space-y-5">
              <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Sprint analytics</h2><p className="mt-1 text-sm text-slate-500">Completion, effort, and daily wellbeing over time.</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">{periods.map((item) => <button key={item.id} type="button" aria-pressed={period === item.id} onClick={() => setPeriod(item.id)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${period === item.id ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-500'}`}>{item.label}</button>)}</div>{period === 'week' && <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"><span>Sprint week</span><select aria-label="Select sprint week" className={`${inputClass} w-auto min-w-28 py-2`} value={selectedAnalyticsWeek} onChange={(event) => setAnalyticsWeek(Number(event.target.value))}>{Array.from({ length: sprintWeekCount }, (_, index) => index + 1).map((week) => <option key={week} value={week}>Week {week}</option>)}</select></label>}</div></header>
              {analyticsLoading && <p className="text-sm text-slate-500" role="status">Loading analytics…</p>}
              {analyticsError && !analyticsLoading && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300" role="alert">{analyticsError}</p>}
              {analytics && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ label: 'Tasks complete', value: `${analytics.metrics.tasksDone}/${analytics.metrics.tasksTotal}` }, { label: 'Hours completed', value: `${analytics.metrics.hours}h` }, { label: 'Average completion', value: `${analytics.metrics.avgScore}%` }, { label: 'Active days', value: String(analytics.metrics.activeDays) }].map((metric) => <article key={metric.label} className={panelClass}><p className="text-xs text-slate-500">{metric.label}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{metric.value}</p></article>)}</div>
                <section className={panelClass}><div className="mb-3"><h3 className="font-semibold text-slate-900 dark:text-white">What stands out</h3><p className="mt-1 text-xs text-slate-500">Highlights from the selected period.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-slate-500">Best completion</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{bestCompletionDay ? `${bestCompletionDay.score}%` : '—'}</p><p className="text-xs text-slate-500">{bestCompletionDay ? `${formatDay(bestCompletionDay.date)} · ${bestCompletionDay.done}/${bestCompletionDay.total} tasks` : 'No scheduled tasks'}</p></div><div><p className="text-xs text-slate-500">Most hours completed</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{bestHoursDay ? `${bestHoursDay.hours}h` : '—'}</p><p className="text-xs text-slate-500">{bestHoursDay ? formatDay(bestHoursDay.date) : 'No completed task hours'}</p></div><div><p className="text-xs text-slate-500">Average focus</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{analytics.metrics.focusAvg == null ? '—' : `${analytics.metrics.focusAvg}h`}</p></div><div><p className="text-xs text-slate-500">Average sleep</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{analytics.metrics.sleepAvg == null ? '—' : `${analytics.metrics.sleepAvg}h`}</p></div></div></section>
                <section className={panelClass}><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold text-slate-900 dark:text-white">Daily progress</h3><p className="mt-1 text-xs text-slate-500">{analytics.from === analytics.to ? formatDay(analytics.from) : `${formatDay(analytics.from)} – ${formatDay(analytics.to)}`}</p></div><span className="text-xs text-slate-500">{analytics.days.length} days</span></div>
                  {analytics.days.length ? <div className="space-y-4">{analytics.days.map((day) => <div key={day.date} className="grid grid-cols-[90px_1fr_105px] items-center gap-3"><div className="text-xs text-slate-500">{formatDay(day.date)}</div><div><div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-700 dark:text-slate-300">{day.done}/{day.total} tasks</span><span className="text-slate-500">{day.score}% · {day.hours}h</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${day.isWeekend ? 'bg-violet-500' : 'bg-indigo-500'}`} style={{ width: `${day.score}%` }} /></div></div><div className="text-right text-[11px] text-slate-500">{day.focusHours != null ? `${day.focusHours}h focus` : '—'}</div></div>)}</div> : <p className="py-8 text-center text-sm text-slate-500">No records in this period yet.</p>}
                </section>
                <div className="grid gap-3 sm:grid-cols-2"><article className={panelClass}><p className="text-xs text-slate-500">Average focus</p><p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{analytics.metrics.focusAvg == null ? '—' : `${analytics.metrics.focusAvg}h`}</p><p className="mt-1 text-xs text-slate-500">From your daily logs</p></article><article className={panelClass}><p className="text-xs text-slate-500">Average sleep</p><p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{analytics.metrics.sleepAvg == null ? '—' : `${analytics.metrics.sleepAvg}h`}</p><p className="mt-1 text-xs text-slate-500">From your daily logs</p></article></div></>}
            </div>
          )}

          {section === 'log' && (
            <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ label: 'Days with notes or tasks', value: loggedDays }, { label: 'Average completion', value: `${logAverage}%` }, { label: 'Tasks completed', value: logTasksDone }, { label: 'Days in sprint', value: logs.length }].map((metric) => <article key={metric.label} className={panelClass}><p className="text-xs text-slate-500">{metric.label}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{metric.value}</p></article>)}</div>
            <section className={`${panelClass} space-y-4`}>
              <div><h2 className="font-semibold text-slate-900 dark:text-white">Daily log</h2><p className="mt-1 text-xs text-slate-500">Click a sprint day to capture what happened, sleep, and focused hours.</p></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[1160px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="px-3 py-2 font-medium">Day</th><th className="px-3 py-2 font-medium">Completion</th><th className="px-3 py-2 font-medium">Tasks</th><th className="px-3 py-2 font-medium">Sleep</th><th className="px-3 py-2 font-medium">Focus</th><th className="px-3 py-2 font-medium">Spent</th><th className="px-3 py-2 font-medium">Spending notes</th><th className="px-3 py-2 font-medium">Tomorrow’s top 3</th><th className="px-3 py-2 font-medium">Follow-ups</th><th className="px-3 py-2 font-medium">Daily summary</th></tr></thead><tbody>{logs.map((log) => <tr key={log._id} className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${log.date === stats?.today ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''}`} onClick={() => setSelectedLog({ ...log })}><td className="px-3 py-3"><b>Day {log.day}</b><span className="ml-2 text-xs text-slate-500">{formatDay(log.date)}{log.isWeekend ? ' · Rest' : ''}</span></td><td className="px-3 py-3"><span className="font-medium">{log.score}%</span><div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-indigo-500" style={{ width: `${log.score}%` }} /></div></td><td className="px-3 py-3 text-slate-500">{log.taskCounts.done}/{log.taskCounts.total}</td><td className="px-3 py-3 text-slate-500">{log.sleepHours ?? '—'}</td><td className="px-3 py-3 text-slate-500">{log.focusHours ?? '—'}</td><td className="px-3 py-3 text-slate-500">{log.spendingAmount ?? '—'}</td><td className="max-w-44 truncate px-3 py-3 text-slate-500">{log.spendingNotes || '—'}</td><td className="max-w-48 truncate px-3 py-3 text-slate-500">{log.tomorrowPriorities?.filter((item) => item.trim()).join(' · ') || '—'}</td><td className="max-w-48 truncate px-3 py-3 text-slate-500">{log.followUps || '—'}</td><td className="max-w-56 truncate px-3 py-3 text-slate-500">{log.accomplishments || '—'}</td></tr>)}</tbody></table></div>
            </section>
            </div>
          )}

          {section === 'reviews' && (
            <div className="space-y-4">
              <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900 dark:text-white">Sprint reviews</h2><p className="mt-1 text-sm text-slate-500">Reflect on your week or wrap up the full sprint.</p></div><button type="button" className={buttonClass} onClick={() => setReviewForm(reviewBlank(reviews.filter((review) => review.type === 'weekly').length + 1))}><Plus className="h-4 w-4" /> New review</button></header>
              {reviews.length ? reviews.map((review) => <button type="button" key={review._id} className={`${panelClass} block w-full text-left transition hover:border-indigo-300`} onClick={() => setReviewForm({ ...review, week: review.week ?? 1 })}><span className="text-sm font-semibold text-slate-900 dark:text-white">{review.type === 'weekly' ? `Week ${review.week}` : 'Final sprint review'}</span><span className="ml-2 text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</span><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{review.summary || 'Add what went well in this review.'}</p>{review.tests && <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-300">Next step: {review.tests}</p>}</button>) : <div className={`${panelClass} py-10 text-center text-sm text-slate-500`}>No reviews yet. Start with a short weekly reflection.</div>}
            </div>
          )}

          {section === 'setup' && (
            <section className={`${panelClass} max-w-2xl`}>
              <h2 className="font-semibold text-slate-900 dark:text-white">Sprint settings</h2><p className="mt-1 text-sm text-slate-500">This sprint began {settings && formatDay(settings.startDate)} and currently runs for {settings?.totalDays} days.</p>
              <form onSubmit={updateSprintStartDate} className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Change sprint start date</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Move Day 1 to a different date. All sprint day dates and scheduled task dates will shift by the same number of days; task details and daily log entries stay attached to their sprint days.</p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="max-w-56 flex-1 space-y-1.5 text-sm font-medium">New Day 1 date<input className={inputClass} type="date" required value={startDateDraft || settings?.startDate || ''} onChange={(event) => setStartDateDraft(event.target.value)} /></label>
                  <button className={buttonClass} disabled={saving || !settings || startDateDraft === settings?.startDate}><CalendarDays className="h-4 w-4" /> Update sprint dates</button>
                </div>
              </form>
              <form onSubmit={extendSprint} className="mt-5 flex flex-wrap items-end gap-3"><label className="max-w-48 flex-1 space-y-1.5 text-sm font-medium">Add days<input className={inputClass} type="number" min="1" max="365" value={extendDays} onChange={(event) => setExtendDays(Number(event.target.value))} /></label><button className={buttonClass} disabled={saving}><Plus className="h-4 w-4" /> Extend sprint</button></form>
              <div className="mt-5 border-t border-slate-100 pt-4 text-sm dark:border-slate-800"><p><span className="text-slate-500">Start date</span><span className="ml-3 font-medium text-slate-800 dark:text-slate-100">{settings && formatDay(settings.startDate)}</span></p><p className="mt-2"><span className="text-slate-500">Rest days</span><span className="ml-3 font-medium text-slate-800 dark:text-slate-100">{settings?.weekendDays.map((day) => weekdays[day].slice(0, 3)).join(', ') || 'None'}</span></p></div>
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Start over</h3>
                <p className="mt-1 text-xs text-slate-500">Remove this sprint and its tasks, daily logs, and reviews so you can set up a new sprint.</p>
                <button type="button" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3.5 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30" onClick={() => void startNewSprint()} disabled={saving}><Trash2 className="h-4 w-4" /> Start a new sprint</button>
              </div>
            </section>
          )}
        </>
      )}

      {currentViewedTask && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingTask(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sprint-task-details-title"
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Sprint task</p>
                <h2 id="sprint-task-details-title" className="mt-1 break-words text-lg font-semibold text-slate-900 dark:text-white">
                  {currentViewedTask.title}
                </h2>
              </div>
              <button type="button" aria-label="Close task details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setViewingTask(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                <p className="text-xs text-slate-500">Status</p>
                <select
                  aria-label="Task status"
                  className={`${inputClass} mt-1`}
                  value={currentViewedTask.status}
                  disabled={saving}
                  onChange={(event) => void moveTaskToStatus(currentViewedTask, event.target.value as TaskStatus)}
                >
                  {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                </select>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                <p className="text-xs text-slate-500">Priority</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityBadgeClasses[currentViewedTask.priority]}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                  {currentViewedTask.priority}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                <p className="text-xs text-slate-500">Scheduled date</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{currentViewedTask.deadline ? formatDay(currentViewedTask.deadline) : 'No date'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                <p className="text-xs text-slate-500">Estimated time</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{currentViewedTask.hours} hours</p>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</h3>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-300">{currentViewedTask.notes || 'No notes added.'}</p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setViewingTask(null)}>Close</button>
              <button type="button" className={buttonClass} onClick={() => { setTaskForm(taskEditForm(currentViewedTask)); setViewingTask(null); }}>
                <Activity className="h-4 w-4" /> Edit task
              </button>
            </div>
          </section>
        </div>
      )}

      {taskForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTaskForm(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="sprint-task-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between"><h2 id="sprint-task-title" className="font-semibold text-slate-900 dark:text-white">{taskForm._id ? 'Edit task' : 'New sprint task'}</h2><button type="button" className="text-sm text-slate-500" onClick={() => setTaskForm(null)}>Close</button></div>
            <form onSubmit={saveTask} className="space-y-4">
              <label className="block space-y-1.5 text-sm font-medium">Task title<input className={inputClass} required maxLength={120} autoFocus value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} /></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">{!taskForm._id && taskForm.repeatMode === 'selected' ? 'First repeat date' : 'Scheduled date'}<input className={inputClass} type="date" required value={taskForm.deadline} onChange={(event) => setTaskForm({ ...taskForm, deadline: event.target.value })} /></label><label className="space-y-1.5 text-sm font-medium">Estimated time (hours)<input className={inputClass} type="number" min="0" max="24" step="0.25" value={taskForm.hours} onChange={(event) => setTaskForm({ ...taskForm, hours: Number(event.target.value) })} /></label></div>
              <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Status<select className={inputClass} value={taskForm.status} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value as TaskStatus })}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium">Priority<select className={inputClass} value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value as TaskPriority })}>{(['high', 'medium', 'low'] as const).map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label></div>
              {!taskForm._id && (
                <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <legend className="px-1 text-sm font-medium">Repeat task</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {([
                      ['none', 'No repeat'],
                      ['until', 'Every day until'],
                      ['selected', 'Selected dates'],
                    ] as const).map(([value, label]) => (
                      <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium dark:bg-slate-950/60">
                        <input type="radio" name="repeat-mode" value={value} checked={taskForm.repeatMode === value} onChange={() => setTaskForm({ ...taskForm, repeatMode: value })} />
                        {label}
                      </label>
                    ))}
                  </div>
                  {taskForm.repeatMode === 'until' && (
                    <label className="block space-y-1.5 text-sm font-medium">Repeat daily through<input className={inputClass} type="date" required min={taskForm.deadline} value={taskForm.repeatUntil} onChange={(event) => setTaskForm({ ...taskForm, repeatUntil: event.target.value })} /><span className="text-xs font-normal text-slate-500">Creates one task per day, up to 90 dates.</span></label>
                  )}
                  {taskForm.repeatMode === 'selected' && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">The first repeat date is included. Add more dates below (up to 90 total).</p>
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="min-w-0 flex-1 space-y-1.5 text-sm font-medium">Add another date<input className={inputClass} type="date" value={taskForm.repeatDateDraft} onChange={(event) => setTaskForm({ ...taskForm, repeatDateDraft: event.target.value })} /></label>
                        <button type="button" className={secondaryButtonClass} onClick={() => {
                          const date = taskForm.repeatDateDraft;
                          if (!date) {
                            toast.error('Choose a date to add.');
                            return;
                          }
                          const dates = [...new Set([taskForm.deadline, ...taskForm.repeatDates, date])].sort();
                          if (dates.length > 90) {
                            toast.error('A repeated task can have at most 90 selected dates.');
                            return;
                          }
                          setTaskForm({ ...taskForm, repeatDates: [...new Set([...taskForm.repeatDates, date])], repeatDateDraft: '' });
                        }}>Add date</button>
                      </div>
                      <ul className="flex flex-wrap gap-2" aria-label="Selected repeat dates">
                        {[...new Set([taskForm.deadline, ...taskForm.repeatDates])].sort().map((date) => (
                          <li key={date} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                            {formatDay(date)}{date === taskForm.deadline ? ' · first' : ''}
                            {date !== taskForm.deadline && <button type="button" aria-label={`Remove ${formatDay(date)}`} className="ml-1 font-bold" onClick={() => setTaskForm({ ...taskForm, repeatDates: taskForm.repeatDates.filter((item) => item !== date) })}>×</button>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </fieldset>
              )}
              <label className="block space-y-1.5 text-sm font-medium">Notes<textarea className={`${inputClass} min-h-24 resize-y`} maxLength={4000} value={taskForm.notes} onChange={(event) => setTaskForm({ ...taskForm, notes: event.target.value })} /></label>
              <div className="flex justify-between gap-2 pt-2">{taskForm._id ? <button type="button" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => { const task = tasks.find((item) => item._id === taskForm._id); if (task) { setTaskForm(null); void deleteTask(task); } }}><Trash2 className="h-4 w-4" /> Delete</button> : <span /> }<button className={buttonClass} disabled={saving}><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save task'}</button></div>
            </form>
          </section>
        </div>
      )}

      {bulkTaskForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setBulkTaskForm(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="sprint-bulk-task-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-3"><div><h2 id="sprint-bulk-task-title" className="font-semibold text-slate-900 dark:text-white">Update selected tasks</h2><p className="mt-1 text-sm text-slate-500">Values are copied from “{tasks.find((task) => selectedTaskIds.includes(task._id))?.title}”. Select the fields you want applied to all {selectedTaskIds.length} selected tasks.</p></div><button type="button" className="text-sm text-slate-500" disabled={saving} onClick={() => setBulkTaskForm(null)}>Close</button></div>
            <form onSubmit={saveBulkTaskUpdates} className="space-y-4">
              <label className="block space-y-1.5 text-sm font-medium"><span className="flex items-center gap-2"><input type="checkbox" checked={bulkTaskFields.title} onChange={(event) => setBulkTaskFields({ ...bulkTaskFields, title: event.target.checked })} />Apply title to all</span><input className={inputClass} required={bulkTaskFields.title} maxLength={120} disabled={!bulkTaskFields.title || saving} value={bulkTaskForm.title} onChange={(event) => setBulkTaskForm({ ...bulkTaskForm, title: event.target.value })} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium"><span className="flex items-center gap-2"><input type="checkbox" checked={bulkTaskFields.deadline} onChange={(event) => setBulkTaskFields({ ...bulkTaskFields, deadline: event.target.checked })} />Apply date to all</span><input className={inputClass} type="date" required={bulkTaskFields.deadline} disabled={!bulkTaskFields.deadline || saving} value={bulkTaskForm.deadline} onChange={(event) => setBulkTaskForm({ ...bulkTaskForm, deadline: event.target.value })} /></label>
                <label className="space-y-1.5 text-sm font-medium"><span className="flex items-center gap-2"><input type="checkbox" checked={bulkTaskFields.hours} onChange={(event) => setBulkTaskFields({ ...bulkTaskFields, hours: event.target.checked })} />Apply estimate to all</span><input className={inputClass} type="number" min="0" max="24" step="0.25" disabled={!bulkTaskFields.hours || saving} value={bulkTaskForm.hours} onChange={(event) => setBulkTaskForm({ ...bulkTaskForm, hours: Number(event.target.value) })} /></label>
                <label className="space-y-1.5 text-sm font-medium"><span className="flex items-center gap-2"><input type="checkbox" checked={bulkTaskFields.status} onChange={(event) => setBulkTaskFields({ ...bulkTaskFields, status: event.target.checked })} />Apply status to all</span><select className={inputClass} disabled={!bulkTaskFields.status || saving} value={bulkTaskForm.status} onChange={(event) => setBulkTaskForm({ ...bulkTaskForm, status: event.target.value as TaskStatus })}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
                <label className="space-y-1.5 text-sm font-medium"><span className="flex items-center gap-2"><input type="checkbox" checked={bulkTaskFields.priority} onChange={(event) => setBulkTaskFields({ ...bulkTaskFields, priority: event.target.checked })} />Apply priority to all</span><select className={inputClass} disabled={!bulkTaskFields.priority || saving} value={bulkTaskForm.priority} onChange={(event) => setBulkTaskForm({ ...bulkTaskForm, priority: event.target.value as TaskPriority })}>{(['high', 'medium', 'low'] as const).map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label>
              </div>
              <label className="block space-y-1.5 text-sm font-medium"><span className="flex items-center gap-2"><input type="checkbox" checked={bulkTaskFields.notes} onChange={(event) => setBulkTaskFields({ ...bulkTaskFields, notes: event.target.checked })} />Apply notes to all</span><textarea className={`${inputClass} min-h-24 resize-y`} maxLength={4000} disabled={!bulkTaskFields.notes || saving} value={bulkTaskForm.notes} onChange={(event) => setBulkTaskForm({ ...bulkTaskForm, notes: event.target.value })} /></label>
              <div className="flex justify-end gap-2 pt-2"><button type="button" className={secondaryButtonClass} disabled={saving} onClick={() => setBulkTaskForm(null)}>Cancel</button><button className={buttonClass} disabled={saving}>{saving ? 'Updating…' : `Save for ${selectedTaskIds.length} tasks`}</button></div>
            </form>
          </section>
        </div>
      )}

      {selectedLog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLog(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="sprint-log-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5"><h2 id="sprint-log-title" className="font-semibold text-slate-900 dark:text-white">Day {selectedLog.day} · {formatDay(selectedLog.date)}</h2><p className="mt-1 text-xs text-slate-500">{selectedLog.isWeekend ? 'Rest day' : `${selectedLog.taskCounts.done}/${selectedLog.taskCounts.total} tasks complete`}</p></div>
            <section className="mb-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/60"><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tasks for this day</h3>{selectedDayTasks.length ? <ul className="mt-2 space-y-2">{selectedDayTasks.map((task) => <li key={task._id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-slate-700 dark:text-slate-300">{task.title}<small className="ml-2 text-xs text-slate-400">{task.hours}h estimated</small></span><span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${task.status === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : task.status === 'doing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{statusLabels[task.status]}</span></li>)}</ul> : <p className="mt-2 text-xs text-slate-500">No tasks scheduled.</p>}</section>
            <form onSubmit={saveLog} className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-500">Review today’s progress, capture spending and follow-ups, then choose tomorrow’s three main priorities.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['sleepHours', 'focusHours'] as const).map((key) => <label key={key} className="space-y-1.5 text-sm font-medium">{key === 'sleepHours' ? 'Sleep (hours)' : 'Focused hours'}<input className={inputClass} type="number" min="0" max="24" step="0.25" value={selectedLog[key] ?? ''} onChange={(event) => setSelectedLog({ ...selectedLog, [key]: event.target.value === '' ? null : Number(event.target.value) })} /></label>)}
              </div>
              <label className="block space-y-1.5 text-sm font-medium">Daily focus / vision<textarea className={`${inputClass} min-h-20 resize-y`} maxLength={4000} placeholder="What is the one thing you wanted to focus on today?" value={selectedLog.focusVision ?? ''} onChange={(event) => setSelectedLog({ ...selectedLog, focusVision: event.target.value })} /></label>
              <label className="block space-y-1.5 text-sm font-medium">Completed work<textarea className={`${inputClass} min-h-20 resize-y`} maxLength={4000} placeholder="What did you complete today?" value={selectedLog.accomplishments} onChange={(event) => setSelectedLog({ ...selectedLog, accomplishments: event.target.value })} /></label>
              <label className="block space-y-1.5 text-sm font-medium">Blockers<textarea className={`${inputClass} min-h-20 resize-y`} maxLength={4000} placeholder="What got in the way?" value={selectedLog.obstacles} onChange={(event) => setSelectedLog({ ...selectedLog, obstacles: event.target.value })} /></label>
              <section className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Spending</h3><p className="mt-1 text-xs text-slate-500">Record today’s total here; review categories and trends in Finance weekly.</p></div>
                <label className="block space-y-1.5 text-sm font-medium">Total spent<input className={inputClass} type="number" min="0" max="1000000000" step="0.01" value={selectedLog.spendingAmount ?? ''} onChange={(event) => setSelectedLog({ ...selectedLog, spendingAmount: event.target.value === '' ? null : Number(event.target.value) })} placeholder="0.00" /></label>
                <label className="block space-y-1.5 text-sm font-medium">Spending notes<textarea className={`${inputClass} min-h-16 resize-y`} maxLength={2000} placeholder="What did you spend on?" value={selectedLog.spendingNotes ?? ''} onChange={(event) => setSelectedLog({ ...selectedLog, spendingNotes: event.target.value })} /></label>
              </section>
              <label className="block space-y-1.5 text-sm font-medium">Outstanding follow-ups<textarea className={`${inputClass} min-h-20 resize-y`} maxLength={2000} placeholder="What still needs attention?" value={selectedLog.followUps ?? ''} onChange={(event) => setSelectedLog({ ...selectedLog, followUps: event.target.value })} /></label>
              <section className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                <div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tomorrow’s three main priorities</h3><p className="mt-1 text-xs text-slate-500">Choose up to three; put the most important first.</p></div>
                {[0, 1, 2].map((index) => <label key={index} className="block space-y-1.5 text-sm font-medium"><span className="text-xs text-slate-500">Priority {index + 1}</span><input className={inputClass} maxLength={160} value={selectedLog.tomorrowPriorities?.[index] ?? ''} onChange={(event) => {
                  const priorities = [...(selectedLog.tomorrowPriorities ?? [])];
                  priorities[index] = event.target.value;
                  setSelectedLog({ ...selectedLog, tomorrowPriorities: priorities.slice(0, 3) });
                }} placeholder={index === 0 ? 'Your most important task' : 'Another important task (optional)'} /></label>)}
              </section>
              <div className="flex justify-end gap-2"><button type="button" className={secondaryButtonClass} onClick={() => setSelectedLog(null)}>Cancel</button><button className={buttonClass} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save review'}</button></div>
            </form>
          </section>
        </div>
      )}

      {reviewForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReviewForm(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="sprint-review-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5"><h2 id="sprint-review-title" className="font-semibold text-slate-900 dark:text-white">{reviewForm._id ? 'Edit review' : 'New review'}</h2><p className="mt-1 text-xs text-slate-500">Look back on progress and choose a next step.</p></div>
            <form onSubmit={saveReview} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Review type<select className={inputClass} value={reviewForm.type} onChange={(event) => setReviewForm({ ...reviewForm, type: event.target.value as ReviewForm['type'] })}><option value="weekly">Weekly</option><option value="final">Final sprint review</option></select></label>{reviewForm.type === 'weekly' && <label className="space-y-1.5 text-sm font-medium">Week<input className={inputClass} type="number" min="1" value={reviewForm.week} onChange={(event) => setReviewForm({ ...reviewForm, week: Number(event.target.value) })} /></label>}</div>
              {reviewForm.type === 'weekly' && <div className="rounded-xl bg-indigo-50 px-4 py-3 text-xs text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">Weekly review covers days {(reviewForm.week - 1) * 7 + 1}–{reviewForm.week * 7}. {displayedReviewWeekStats ? `${displayedReviewWeekStats.avgScore}% average completion · ${displayedReviewWeekStats.hours}h completed · ${displayedReviewWeekStats.tasksDone} tasks done${displayedReviewWeekStats.sleepAvg != null ? ` · ${displayedReviewWeekStats.sleepAvg}h average sleep` : ''}${displayedReviewWeekStats.focusAvg != null ? ` · ${displayedReviewWeekStats.focusAvg}h average focus` : ''}` : 'Weekly progress is unavailable until the sprint API responds.'}</div>}
              {reviewForm.type === 'weekly' && displayedReviewWeekStats?.daily.length ? <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[420px] text-left text-xs"><thead className="text-slate-500"><tr><th className="px-3 py-2 font-medium">Day</th><th className="px-3 py-2 font-medium">Completion</th><th className="px-3 py-2 font-medium">Tasks</th><th className="px-3 py-2 font-medium">Hours</th></tr></thead><tbody>{displayedReviewWeekStats.daily.map((day) => <tr key={day.day} className="border-t border-slate-100 dark:border-slate-800"><td className="px-3 py-2">Day {day.day} · {formatDay(day.date)}</td><td className="px-3 py-2">{day.score}%</td><td className="px-3 py-2">{day.done}/{day.total}</td><td className="px-3 py-2">{day.hours}h</td></tr>)}</tbody></table></div> : null}
              {([['summary', 'What went well?', 'What did you finish or learn?'], ['change', 'What should improve?', 'What made progress harder than it needed to be?'], ['tests', reviewForm.type === 'weekly' ? 'One next step' : 'What will you carry forward?', 'Make the next step small and specific.']] as const).map(([key, label, placeholder]) => <label key={key} className="block space-y-1.5 text-sm font-medium">{label}<textarea className={`${inputClass} min-h-24 resize-y`} maxLength={4000} placeholder={placeholder} value={reviewForm[key]} onChange={(event) => setReviewForm({ ...reviewForm, [key]: event.target.value })} /></label>)}
              <div className="flex justify-between gap-2 pt-2">{reviewForm._id ? <button type="button" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => void deleteReview()}><Trash2 className="h-4 w-4" /> Delete</button> : <span /> }<button className={buttonClass} disabled={saving}><Save className="h-4 w-4" /> Save review</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
