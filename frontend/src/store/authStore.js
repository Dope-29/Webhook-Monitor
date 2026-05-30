import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token:      localStorage.getItem('hw_token')       || null,
  customerId: localStorage.getItem('hw_customer_id') || null,
  userName:   localStorage.getItem('hw_user_name')   || null,
  isAuthenticated: !!localStorage.getItem('hw_token'),

  setAuth: (token, customerId, userName = null) => {
    localStorage.setItem('hw_token', token);
    localStorage.setItem('hw_customer_id', customerId);
    if (userName) localStorage.setItem('hw_user_name', userName);
    set({ token, customerId, userName, isAuthenticated: true });
  },

  setUserName: (name) => {
    localStorage.setItem('hw_user_name', name);
    set({ userName: name });
  },

  logout: () => {
    localStorage.removeItem('hw_token');
    localStorage.removeItem('hw_customer_id');
    localStorage.removeItem('hw_user_name');
    set({ token: null, customerId: null, userName: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
