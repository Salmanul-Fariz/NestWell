import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, X, type LucideIcon } from 'lucide-react';
import { ToastContext, type ToastAction } from './toast-context';

type ToastKind = 'success' | 'error';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string, action?: ToastAction) => {
    const id = ++nextId.current;
    setItems((current) => [...current.slice(-2), { id, kind, message, action }]);
  }, []);

  const success = useCallback((message: string) => push('success', message), [push]);
  const error = useCallback((message: string, action?: ToastAction) => push('error', message, action), [push]);
  const toastApi = useMemo(() => ({ success, error }), [error, success]);

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-full sm:max-w-md sm:items-end"
        aria-label="Notifications"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const isSuccess = item.kind === 'success';
            const Icon = isSuccess ? CheckCircle2 : AlertCircle;
            return (
              <ToastNotification
                key={item.id}
                item={item}
                Icon={Icon}
                onDismiss={dismiss}
                onAction={() => {
                  item.action?.onClick();
                  dismiss(item.id);
                }}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const ToastNotification: React.FC<{
  item: ToastItem;
  Icon: LucideIcon;
  onDismiss: (id: number) => void;
  onAction: () => void;
}> = ({ item, Icon, onDismiss, onAction }) => {
  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(item.id), item.action ? 10000 : 4500);
    return () => window.clearTimeout(timeout);
  }, [item.action, item.id, onDismiss]);

  const isSuccess = item.kind === 'success';
  return (
    <motion.div
      role={isSuccess ? 'status' : 'alert'}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl dark:bg-slate-900 ${
        isSuccess
          ? 'border-emerald-200 dark:border-emerald-900'
          : 'border-rose-200 dark:border-rose-900'
      }`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${
          isSuccess ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 break-words text-sm text-slate-800 dark:text-slate-100">
        {item.message}
      </p>
      {item.action && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-800"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};
