import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import PageMetadata from './components/PageMetadata';
import AppErrorBoundary from './components/AppErrorBoundary';
import { AuthProvider } from '@/context/AuthProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><AuthProvider>
      <PageMetadata />
      <App />
    </AuthProvider></AppErrorBoundary>
  </StrictMode>
);
