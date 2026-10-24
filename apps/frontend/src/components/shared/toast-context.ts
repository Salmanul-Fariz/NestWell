import { createContext, useContext } from 'react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string, action?: ToastAction) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export const useToast = () => {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast must be used within ToastProvider.');
  return toast;
};
