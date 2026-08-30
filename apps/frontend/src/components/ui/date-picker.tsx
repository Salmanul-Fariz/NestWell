import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '../../lib/utils';

export interface DatePickerProps {
  label?: string;
  error?: string;
  value?: string; // YYYY-MM-DD
  onChange?: (dateString: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  error,
  value,
  onChange,
  placeholder = 'Select date',
  className,
  disabled,
}) => {
  const [open, setOpen] = React.useState(false);
  const selectedDate = value ? new Date(value + 'T00:00:00') : undefined;

  const [viewDate, setViewDate] = React.useState<Date>(
    selectedDate || new Date(),
  );

  React.useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleSelectDay = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange?.(`${year}-${m}-${d}`);
    setOpen(false);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
          {label}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-11 w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 select-none cursor-pointer',
              'bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400',
              error
                ? 'border-rose-500 focus:border-rose-500'
                : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900',
              className,
            )}
          >
            <span className={cn('truncate', !selectedDate && 'text-slate-400')}>
              {selectedDate ? format(selectedDate, 'PPP') : placeholder}
            </span>
            <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[280px] p-4 bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl backdrop-blur-xl"
          align="start"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {format(viewDate, 'MMMM yyyy')}
            </h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-semibold text-slate-400">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="py-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: startDay }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 w-8" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const selected = isSelected(dayNum);
              const today = isToday(dayNum);

              return (
                <button
                  type="button"
                  key={dayNum}
                  onClick={() => handleSelectDay(dayNum)}
                  className={cn(
                    'h-8 w-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer',
                    selected
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : today
                      ? 'border border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const d = String(now.getDate()).padStart(2, '0');
                onChange?.(`${now.getFullYear()}-${m}-${d}`);
                setOpen(false);
              }}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange?.('');
                setOpen(false);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
    </div>
  );
};
