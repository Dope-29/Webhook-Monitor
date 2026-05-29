import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('hw_token') || null,
  customerId: localStorage.getItem('hw_customer_id') || null,
  isAuthenticated: !!localStorage.getItem('hw_token'),

  setAuth: (token, customerId) => {
    localStorage.setItem('hw_token', token);
    localStorage.setItem('hw_customer_id', customerId);
    set({ token, customerId, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('hw_token');
    localStorage.removeItem('hw_customer_id');
    set({ token: null, customerId: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
