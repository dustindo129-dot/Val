import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../src/App';

export { render };

async function render(pageContext) {
  const { isBot } = pageContext;
  
  // Create a client
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
  
  // Hydrate React Query state if it exists (from SSR)
  if (window.__REACT_QUERY_STATE__) {
    const queryState = window.__REACT_QUERY_STATE__;
    queryState.forEach(({ queryHash, queryKey, state }) => {
      queryClient.setQueryData(queryKey, state.data);
    });
  }
  
  const root = document.getElementById('root');
  
  // The app component wrapped with providers
  const app = (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  );
  
  // If we were rendered by the server (as a bot), we need to hydrate
  // Otherwise, just render normally
  if (isBot) {
    hydrateRoot(root, app);
  } else {
    // This is normal CSR
    createRoot(root).render(app);
  }
} 