import { useEffect } from 'react';
import { create } from 'zustand';

// Modal state store — call `confirm(...)` to show, resolves a Promise
const useModalStore = create((set) => ({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  danger: false,
  resolve: null,

  show: ({ title, message, confirmLabel = 'Confirm', danger = false }) =>
    new Promise((resolve) => {
      set({ open: true, title, message, confirmLabel, danger, resolve });
    }),

  close: (result) =>
    set((s) => {
      s.resolve?.(result);
      return { open: false, resolve: null };
    }),
}));

/** Call this instead of window.confirm() */
export function useConfirm() {
  return useModalStore.getState().show;
}

/** Renders the modal — mount once near the app root */
export default function ConfirmModal() {
  const { open, title, message, confirmLabel, danger, close } = useModalStore();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => close(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        {message && <div className="modal-desc">{message}</div>}
        <div className="modal-actions">
          <button className="btn btn-sm" onClick={() => close(false)}>Cancel</button>
          <button
            className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => close(true)}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
