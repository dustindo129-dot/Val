/**
 * main.jsx
 * 
 * Main entry point for the React application.
 * Features:
 * - React 18 root creation
 * - Strict mode for development
 * - Global styles import
 */

// Import required dependencies
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/shared/index.css';

// Create React Query client - IMPORTANT: Create outside component to avoid hook conflicts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Initialize the application unless we're being rendered by vite-plugin-ssr
// This ensures the app renders in both DEV and PROD when not using SSR
if (!window.__VITE_PLUGIN_SSR) {
  // Get the root element
  const root = document.getElementById('root');

  // Render the app only if the root element exists
  if (root) {
    createRoot(root).render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </React.StrictMode>
    );
  }
}

// Export the app component with providers for vite-plugin-ssr
export default function MainApp() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  );
} 