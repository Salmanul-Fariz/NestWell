import React from 'react';
import { cn } from '../../lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
export { DatePicker } from './date-picker';

export const FormInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    rightElement?: React.ReactNode;
  }
> = ({ label, error, icon, rightElement, className = '', id, ...props }) => {
  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 select-none"
        >
          {label}
        </label>
      )}
      <div className="relative group w-full flex items-center">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
            {icon}
          </div>
        )}
        <input
          id={id}
          className={cn(
            'w-full h-11 py-2.5 rounded-xl text-sm transition-all duration-200 focus:outline-none select-text',
            icon ? 'pl-10' : 'pl-3.5',
            rightElement ? 'pr-11' : 'pr-3.5',
            'bg-slate-50 dark:bg-slate-950/60 border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500',
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20',
            className,
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
    </div>
  );
};

export interface OptionItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export const FormSelect: React.FC<{
  label?: string;
  error?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  options: OptionItem[] | readonly string[];
  onChange?: (value: string) => void;
  className?: string;
}> = ({ label, error, value, defaultValue, placeholder = 'Select an option...', options, onChange, className }) => {
  const formattedOptions: OptionItem[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt,
  );

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
          {label}
        </label>
      )}
      <Select value={value} defaultValue={defaultValue} onValueChange={onChange}>
        <SelectTrigger error={!!error} className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {formattedOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                {opt.icon && <span className="text-slate-400">{opt.icon}</span>}
                <span>{opt.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
    </div>
  );
};

export const FormTextarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    error?: string;
  }
> = ({ label, error, className = '', id, ...props }) => {
  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 select-none"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 focus:outline-none select-text',
          'bg-slate-50 dark:bg-slate-950/60 border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500',
          error
            ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
            : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20',
          className,
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
    </div>
  );
};
