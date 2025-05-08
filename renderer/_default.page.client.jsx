import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import MainApp from '../src/main.jsx';

export { render };

async function render(pageContext) {
  const { isBot } = pageContext;
  
  // Set a global flag so main.jsx knows we're using vite-plugin-ssr
  window.__VITE_PLUGIN_SSR = true;
  
  const root = document.getElementById('root');
  
  // If we were rendered by the server (as a bot), we need to hydrate
  // Otherwise, just render normally
  if (isBot) {
    hydrateRoot(root, <MainApp />);
  } else {
    // This is normal CSR
    createRoot(root).render(<MainApp />);
  }
} 