import React from 'react';

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
          className={`w-full py-2.5 rounded-xl text-sm transition-all duration-200 focus:outline-none ${
            icon ? 'pl-10' : 'pl-3.5'
          } ${rightElement ? 'pr-11' : 'pr-3.5'} bg-slate-50 dark:bg-slate-950/60 border ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20'
          } ${className}`}
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

export const FormSelect: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
  }
> = ({ label, error, icon, className = '', id, children, ...props }) => {
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
        <select
          id={id}
          className={`w-full py-2.5 rounded-xl text-sm transition-all duration-200 focus:outline-none cursor-pointer ${
            icon ? 'pl-10' : 'pl-3.5'
          } pr-8 bg-slate-50 dark:bg-slate-950/60 border ${
            error
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
      </div>
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
        className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 focus:outline-none bg-slate-50 dark:bg-slate-950/60 border ${
          error
            ? 'border-rose-500 focus:border-rose-500'
            : 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
    </div>
  );
};
