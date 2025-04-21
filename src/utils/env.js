// Environment variable utility
// This provides a consistent way to access environment variables

export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;

// HMR-related constants
export const HMR_CONFIG_NAME = import.meta.env.VITE_HMR_CONFIG_NAME || '';

// Application constants
export const SERVER_HOST = import.meta.env.SERVER_HOST || 'localhost';
export const SERVER_PORT = import.meta.env.SERVER_PORT || '5000';
export const SERVER_URL = import.meta.env.SERVER_URL || 'http://localhost:5000';
export const CLIENT_HOST = import.meta.env.CLIENT_HOST || 'localhost';
export const CLIENT_PORT = import.meta.env.CLIENT_PORT || (isDev ? '5173' : '4173');

// Legacy compatibility
export const __HMR_CONFIG_NAME__ = HMR_CONFIG_NAME;
export const __DEFINES__ = {};
export const __BASE__ = '/';
export const __DEV__ = isDev;
export const __PROD__ = isProd;
export const __SERVER_HOST__ = SERVER_HOST;
export const __SERVER_PORT__ = SERVER_PORT;
export const __SERVER_URL__ = SERVER_URL;
export const __CLIENT_HOST__ = CLIENT_HOST;
export const __CLIENT_PORT__ = CLIENT_PORT; 