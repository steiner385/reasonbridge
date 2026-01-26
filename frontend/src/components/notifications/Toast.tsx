import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, InfoIcon, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps extends Toast {
  onClose: (id: string) => void;
}

const typeStyles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: <XCircle className="w-5 h-5 text-red-600" />,
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: <InfoIcon className="w-5 h-5 text-blue-600" />,
  },
};

const textStyles: Record<ToastType, { title: string; message: string }> = {
  success: {
    title: 'text-green-900',
    message: 'text-green-800',
  },
  error: {
    title: 'text-red-900',
    message: 'text-red-800',
  },
  warning: {
    title: 'text-yellow-900',
    message: 'text-yellow-800',
  },
  info: {
    title: 'text-blue-900',
    message: 'text-blue-800',
  },
};

export function Toast({ id, type, title, message, duration = 5000, action, onClose }: ToastProps) {
  const styles = typeStyles[type];
  const textColor = textStyles[type];

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [id, duration, onClose]);

  return (
    <div
      className={`${styles.bg} border ${styles.border} rounded-lg p-4 shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-right-5 duration-300`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-semibold ${textColor.title}`}>{title}</h3>
        {message && <p className={`text-sm mt-1 ${textColor.message}`}>{message}</p>}
        {action && (
          <button
            onClick={action.onClick}
            className={`text-sm font-medium mt-2 ${textColor.title} hover:underline`}
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className={`flex-shrink-0 ${textColor.title} hover:opacity-70 transition-opacity`}
        aria-label="Close notification"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
