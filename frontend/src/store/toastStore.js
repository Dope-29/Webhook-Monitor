import { create } from 'zustand';

let _nextId = 1;

const useToastStore = create((set) => ({
  toasts: [],

  addToast: ({ message, type = 'info', duration = 3500 }) => {
    const id = _nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Convenience helpers — call outside of React components
export function toast(message, type = 'info') {
  useToastStore.getState().addToast({ message, type });
}
export function toastSuccess(message) { toast(message, 'success'); }
export function toastError(message)   { toast(message, 'error'); }
export function toastWarn(message)    { toast(message, 'warn'); }

export default useToastStore;
