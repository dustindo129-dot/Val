import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = command === 'build';
  const isDevelopment = mode === 'development';

  // Basic shared definitions that work in both environments
  const sharedDefines = {
    'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
  };

  // Production-specific definitions (only applied during build)
  const productionDefines = isProduction ? {
    // Required globally-accessible constants for production
    '__DEFINES__': JSON.stringify({}),
    '__BASE__': JSON.stringify('/'),
    '__DEV__': JSON.stringify(false),
    '__PROD__': JSON.stringify(true),
    '__SERVER_HOST__': JSON.stringify('localhost'),
    '__SERVER_PORT__': JSON.stringify('5000'),
    '__SERVER_URL__': JSON.stringify('http://localhost:5000'),
    '__CLIENT_HOST__': JSON.stringify('localhost'),
    '__CLIENT_PORT__': JSON.stringify('4173'),
    
    // HMR constants required for production
    '__HMR_CONFIG_NAME__': JSON.stringify(''),
    '__HMR_PROTOCOL__': JSON.stringify(''),
    '__HMR_HOST__': JSON.stringify(''),
    '__HMR_PORT__': JSON.stringify(0),
    '__HMR_BASE__': JSON.stringify('/'),
    '__HMR_TIMEOUT__': JSON.stringify(0),
    '__HMR_ENABLE__': JSON.stringify(false),
    '__HMR_CLIENT_PORT__': JSON.stringify(0),
    '__HMR_CLIENT_HOST__': JSON.stringify(''),
    '__HMR_HOSTNAME__': JSON.stringify(''),
    '__HMR_DIRECT_TARGET__': JSON.stringify(''),
    '__HMR_PATH__': JSON.stringify(''),
    '__HMR_OVERLAY__': JSON.stringify(false),
    '__HMR_ENABLE_OVERLAY__': JSON.stringify(false),
    '__HMR_ERROR_OVERLAY__': JSON.stringify(false),
    
    // Websocket variables
    '__WS_TOKEN__': JSON.stringify(''),
    '__WS_HOST__': JSON.stringify(''),
    '__WS_PORT__': JSON.stringify(0),
    '__WS_PROTOCOL__': JSON.stringify(''),
    '__WS_HMR_PATH__': JSON.stringify(''),
    '__WS_HMR_TIMEOUT__': JSON.stringify(0),
  } : {};

  // Development-specific definitions (no complex definitions that might cause issues)
  const developmentDefines = isDevelopment ? {
    // Minimal development defines
    '__DEV__': JSON.stringify(true),
    '__PROD__': JSON.stringify(false),
  } : {};

  return {
    base: '/',  // Always use root as base
    server: {
      port: 5173,
      host: 'localhost',
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
      },
      hmr: isDevelopment ? {
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
        overlay: true,
      } : false,
      // Add history API fallback for client-side routing
      historyApiFallback: true
    },
    preview: {
      port: 4173,
      host: 'localhost',
      hmr: false,
      // Add history API fallback for client-side routing in preview mode
      historyApiFallback: true
    },
    resolve: {
      dedupe: ['react', 'react-dom', '@tanstack/react-query'],
      alias: {
        '~': path.resolve(__dirname, './src'),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
        'react/jsx-dev-runtime': path.resolve(__dirname, './node_modules/react/jsx-dev-runtime'),
        '@tanstack/react-query': path.resolve(__dirname, './node_modules/@tanstack/react-query'),
      },
    },
    plugins: [react()],
    define: {
      ...sharedDefines,
      ...(isProduction ? productionDefines : developmentDefines),
    },
    build: {
      minify: isProduction,
      sourcemap: !isProduction,
      // Don't empty outDir to preserve the .gitkeep file
      emptyOutDir: false,
      // Ensure proper chunking
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: [
              'react', 
              'react-dom', 
              'react-router-dom',
              '@tanstack/react-query'
            ],
          }
        }
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query'
      ]
    }
  };
});