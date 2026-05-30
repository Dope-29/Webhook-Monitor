import { IconX, IconCheck, IconAlertTriangle, IconInfoCircle, IconXboxX } from '@tabler/icons-react';
import useToastStore from '../store/toastStore';

const ICONS = {
  success: <IconCheck size={15} stroke={2} />,
  error:   <IconXboxX size={15} stroke={2} />,
  warn:    <IconAlertTriangle size={15} stroke={2} />,
  info:    <IconInfoCircle size={15} stroke={1.5} />,
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role="alert">
          {ICONS[t.type]}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, opacity: 0.7 }}
          >
            <IconX size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
