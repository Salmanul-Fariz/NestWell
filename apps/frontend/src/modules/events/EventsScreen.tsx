import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { FormInput, FormSelect, FormTextarea, DatePicker } from '../../components/ui/FormControls';
import { apiErrorMessage, formatDateOnly, todayDateOnly, toDateOnly, toIsoUtcDate } from '../../lib/utils';
import {
  EVENT_CATEGORIES,
  formatConstantLabel,
  type EventCategory,
  type EventRecurrenceFreq,
} from '@nestwell/shared-types';
import {
  Calendar as CalendarIcon,
  Plus,
  MapPin,
  Bell,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Repeat,
  RepeatOff,
} from 'lucide-react';

interface EventReminder {
  offsetMinutes: number;
}

interface EventItem {
  _id: string;
  title: string;
  category?: EventCategory;
  description?: string;
  location?: string;
  startAt: string;
  endAt?: string | null;
  allDay: boolean;
  recurrence?: {
    freq: EventRecurrenceFreq;
    interval: number;
    until?: string;
  };
  reminders: EventReminder[];
  createdAt: string;
}

/** Check if an event occurs on the given date string YYYY-MM-DD */
function isEventOnDate(event: EventItem, dateStr: string): boolean {
  const [targetYear, targetMonth, targetDay] = dateStr.split('-').map(Number);
  const startStr = toDateOnly(event.startAt);
  if (!startStr) return false;

  const [startYear, startMonth, startDay] = startStr.split('-').map(Number);
  const freq = event.recurrence?.freq || 'NONE';
  const interval = event.recurrence?.interval || 1;

  if (event.recurrence?.until) {
    const untilStr = toDateOnly(event.recurrence.until);
    if (untilStr && dateStr > untilStr) return false;
  }

  if (freq === 'NONE') {
    const endStr = toDateOnly(event.endAt) || startStr;
    return dateStr >= startStr && dateStr <= endStr;
  }

  // Recurring events don't trigger before their original start date
  if (dateStr < startStr) return false;

  if (freq === 'YEARLY') {
    if (startMonth === targetMonth && startDay === targetDay) {
      const yearDiff = targetYear - startYear;
      return yearDiff >= 0 && yearDiff % interval === 0;
    }
    return false;
  }

  if (freq === 'MONTHLY') {
    if (startDay === targetDay) {
      const monthDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth);
      return monthDiff >= 0 && monthDiff % interval === 0;
    }
    return false;
  }

  if (freq === 'WEEKLY') {
    const startDateObj = new Date(startYear, startMonth - 1, startDay);
    const targetDateObj = new Date(targetYear, targetMonth - 1, targetDay);
    const diffDays = Math.round((targetDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays % (7 * interval) === 0;
  }

  if (freq === 'DAILY') {
    const startDateObj = new Date(startYear, startMonth - 1, startDay);
    const targetDateObj = new Date(targetYear, targetMonth - 1, targetDay);
    const diffDays = Math.round((targetDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays % interval === 0;
  }

  return false;
}

export const EventsScreen: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('REMINDER');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(todayDateOnly());
  const [endDate, setEndDate] = useState('');
  const [freq, setFreq] = useState<EventRecurrenceFreq>('NONE');
  const [selectedOffsets, setSelectedOffsets] = useState<number[]>([1440]); // Default 1 day before
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch (err: any) {
      console.error('Failed to fetch events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const openModal = (event?: EventItem) => {
    setError(null);
    if (event) {
      setEditingEvent(event);
      setTitle(event.title);
      setCategory(event.category || 'REMINDER');
      setDescription(event.description || '');
      setLocation(event.location || '');
      setStartDate(toDateOnly(event.startAt) || todayDateOnly());
      setEndDate(toDateOnly(event.endAt));
      setFreq(event.recurrence?.freq || 'NONE');
      setSelectedOffsets(event.reminders?.map((r) => r.offsetMinutes) || [1440]);
    } else {
      setEditingEvent(null);
      setTitle('');
      setCategory('REMINDER');
      setDescription('');
      setLocation('');
      setStartDate(todayDateOnly());
      setEndDate('');
      setFreq('NONE');
      setSelectedOffsets([1440]);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) {
      setError('Title and Event Date are required.');
      return;
    }

    if (endDate && endDate < startDate) {
      setError('End date cannot be before the start date.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      title: title.trim(),
      category,
      description: description.trim() || undefined,
      location: location.trim(),
      startAt: toIsoUtcDate(startDate),
      endAt: endDate ? toIsoUtcDate(endDate) : null,
      allDay: true,
      recurrence: { freq, interval: 1 },
      reminders: selectedOffsets.map((offsetMinutes) => ({ offsetMinutes })),
    };

    try {
      if (editingEvent) {
        const res = await api.patch(`/events/${editingEvent._id}`, payload);
        setEvents((prev) => prev.map((ev) => (ev._id === editingEvent._id ? res.data : ev)));
      } else {
        const res = await api.post('/events', payload);
        setEvents((prev) => [res.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Failed to save event'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents((prev) => prev.filter((e) => e._id !== id));
    } catch {
      alert('Failed to delete event');
    }
  };

  const handleToggleRecurring = async (id: string, currentFreq: string) => {
    const isRecurring = currentFreq && currentFreq !== 'NONE';
    const nextFreq: EventRecurrenceFreq = isRecurring ? 'NONE' : 'YEARLY';
    try {
      const res = await api.patch(`/events/${id}`, {
        recurrence: { freq: nextFreq, interval: 1 },
      });
      setEvents((prev) => prev.map((ev) => (ev._id === id ? res.data : ev)));
    } catch {
      alert('Failed to update event recurrence');
    }
  };

  const toggleOffset = (offset: number) => {
    if (selectedOffsets.includes(offset)) {
      setSelectedOffsets(selectedOffsets.filter((o) => o !== offset));
    } else {
      setSelectedOffsets([...selectedOffsets, offset].sort((a, b) => a - b));
    }
  };

  const formatOffsetLabel = (mins: number) => {
    if (mins === 0) return 'On event day';
    if (mins < 1440) return `${Math.round(mins / 60)} hrs before`;
    return `${Math.round(mins / 1440)} day(s) before`;
  };

  const yearsRange = useMemo(() => {
    const currYear = new Date().getFullYear();
    const list = [];
    for (let y = currYear - 5; y <= currYear + 10; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Events & Calendar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Date-based recurring schedules, milestone dates & multi-channel reminder alerts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Month View
            </button>
          </div>

          <button
            onClick={() => openModal()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Event</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl shadow-indigo-500/10 flex items-start gap-3.5 backdrop-blur-xl"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 pr-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Alert Dispatch Success</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Triggered
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feedback}</p>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs font-medium">Loading scheduled events...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
          <CalendarIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No events scheduled</p>
          <p className="text-xs text-slate-400 mt-1">
            Click "+ Schedule Event" to set reminders for birthdays, anniversaries, or subscription renewals.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((item) => {
            const isRecurring = item.recurrence && item.recurrence.freq !== 'NONE';
            const hasRange = Boolean(item.endAt) && toDateOnly(item.startAt) !== toDateOnly(item.endAt);

            return (
              <motion.div
                key={item._id}
                layout
                className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/40 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {item.title}
                          </h4>
                          {item.category && (
                            <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {formatConstantLabel(item.category)}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDateOnly(item.startAt)}
                          {hasRange && <> – {formatDateOnly(item.endAt)}</>}
                        </span>
                      </div>
                    </div>

                    {isRecurring && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        <span className="capitalize">{item.recurrence?.freq.toLowerCase()}</span>
                      </span>
                    )}
                  </div>

                  {item.location && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 my-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}

                  {item.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 my-2">
                      {item.description}
                    </p>
                  )}

                  {item.reminders && item.reminders.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 my-3">
                      {item.reminders.map((r, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          <Bell className="w-2.5 h-2.5 text-indigo-500" />
                          {formatOffsetLabel(r.offsetMinutes)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  {isRecurring && (
                    <button
                      onClick={() => handleToggleRecurring(item._id, item.recurrence?.freq || 'NONE')}
                      className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
                      title="Turn off event recurrence"
                    >
                      <RepeatOff className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => openModal(item)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Edit Event"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete Event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          {/* Calendar Header with Month & Year dropdowns + prev/next */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              {/* Month Selector */}
              <select
                aria-label="Select month"
                value={currentDate.getMonth()}
                onChange={(e) =>
                  setCurrentDate(new Date(currentDate.getFullYear(), Number(e.target.value), 1))
                }
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {monthsList.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                aria-label="Select year"
                value={currentDate.getFullYear()}
                onChange={(e) =>
                  setCurrentDate(new Date(Number(e.target.value), currentDate.getMonth(), 1))
                }
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {yearsRange.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
              const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
              const cellCount = Math.ceil((firstDay + daysInMonth) / 7) * 7;
              return Array.from({ length: cellCount }).map((_, idx) => {
              const dayNumber = idx - firstDay + 1;
              const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;

              const cellDateStr = isValidDay
                ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
                : '';

              const dayEvents = isValidDay
                ? events.filter((e) => isEventOnDate(e, cellDateStr))
                : [];

              return (
                <div
                  key={idx}
                  className={`min-h-[95px] p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isValidDay
                      ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/80'
                      : 'opacity-20 border-transparent'
                  }`}
                >
                  {isValidDay && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{dayNumber}</span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 font-bold">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 overflow-y-auto max-h-[65px] no-scrollbar">
                        {dayEvents.map((ev) => (
                          <div
                            key={ev._id}
                            onClick={() => openModal(ev)}
                            className="text-[10px] font-medium p-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 truncate cursor-pointer hover:bg-indigo-500/20 transition-colors flex items-center gap-1"
                            title={`${ev.title} (${ev.category || 'Event'})`}
                          >
                            {ev.recurrence && ev.recurrence.freq !== 'NONE' && (
                              <Repeat className="w-2.5 h-2.5 shrink-0 text-purple-600 dark:text-purple-400" />
                            )}
                            <span className="truncate">{ev.title}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            });
            })()}
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    {editingEvent ? 'Edit Event' : 'Schedule New Event'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Event Title *"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Mom's Birthday, Domain Renewal"
                  />

                  <FormSelect
                    label="Category"
                    value={category}
                    onChange={(val: any) => setCategory(val)}
                    options={EVENT_CATEGORIES.map((c) => ({
                      value: c,
                      label: formatConstantLabel(c),
                    }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DatePicker
                    label="Event Date *"
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                  />

                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    placeholder="Optional"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Home, Google Meet (optional)"
                    icon={<MapPin className="w-4 h-4" />}
                  />

                  <FormSelect
                    label="Recurrence Frequency"
                    value={freq}
                    onChange={(val: any) => setFreq(val)}
                    options={[
                      { value: 'NONE', label: 'Does not repeat' },
                      { value: 'DAILY', label: 'Daily' },
                      { value: 'WEEKLY', label: 'Weekly' },
                      { value: 'MONTHLY', label: 'Monthly' },
                      { value: 'YEARLY', label: 'Yearly' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Reminder Alerts
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { mins: 0, label: 'On day' },
                      { mins: 1440, label: '1 day before' },
                      { mins: 2880, label: '2 days before' },
                      { mins: 10080, label: '1 week before' },
                    ].map((opt) => {
                      const isSelected = selectedOffsets.includes(opt.mins);
                      return (
                        <button
                          type="button"
                          key={opt.mins}
                          onClick={() => toggleOffset(opt.mins)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <FormTextarea
                  label="Description / Notes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details, gift ideas, renewal instructions..."
                />

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingEvent ? 'Save Changes' : 'Create Event'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
