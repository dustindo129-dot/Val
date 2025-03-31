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
import App from './App';
import './index.css';

// Get the root DOM element where the app will be mounted
const container = document.getElementById('root');

// Create a root using React 18's createRoot API
const root = createRoot(container);

// Render the application inside React.StrictMode
// StrictMode helps identify potential problems in the app during development
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 