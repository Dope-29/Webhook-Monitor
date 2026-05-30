import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ToastContainer from './components/Toast.jsx';
import ConfirmModal from './components/ConfirmModal.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
        <ToastContainer />
        <ConfirmModal />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>
);
