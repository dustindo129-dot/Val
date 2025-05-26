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
      historyApiFallback: true,
      // Disable WebSocket in production
      ws: isDevelopment
    },
    preview: {
      port: 4173,
      host: 'localhost',
      hmr: false,
      // Add history API fallback for client-side routing in preview mode
      historyApiFallback: true,
      // Add proxy for API requests in preview mode
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
      }
    },
    resolve: {
      // Enhanced deduplication - ensures all React packages use the same instance
      dedupe: [
        'react', 
        'react-dom', 
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@tanstack/react-query',
        'use-sync-external-store',
        'use-sync-external-store/shim',
        'scheduler',
        'react-router',
        'react-router-dom',
        'react-is',
        'object-assign'
      ],
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
    plugins: [
      react({
        jsxRuntime: 'automatic',
        jsxImportSource: 'react',
        babel: {
          plugins: [
            ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
          ]
        }
      })
    ],
    define: {
      ...sharedDefines,
      ...(isProduction ? productionDefines : developmentDefines),
    },
    build: {
      minify: isProduction,
      sourcemap: !isProduction,
      // Don't empty outDir to preserve the .gitkeep file
      emptyOutDir: false,
      // Increase chunk size warning limit to 1MB (1000KB) since 500KB is too restrictive for modern apps
      chunkSizeWarningLimit: 1000,
      // Ensure proper chunking
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunks for external libraries
            if (id.includes('node_modules')) {
              // React ecosystem
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              // Router
              if (id.includes('react-router')) {
                return 'router';
              }
              // Query library
              if (id.includes('@tanstack/react-query')) {
                return 'query';
              }
              // UI and styling libraries
              if (id.includes('dompurify') || id.includes('helmet') || id.includes('fontawesome')) {
                return 'ui-vendor';
              }
              // HTTP and utilities
              if (id.includes('axios') || id.includes('lodash')) {
                return 'utils-vendor';
              }
              // All other node_modules
              return 'vendor';
            }
            
            // Application chunks based on functionality
            // Authentication related components
            if (id.includes('/auth/') || id.includes('Auth')) {
              return 'auth';
            }
            
            // Novel detail and related components (largest component)
            if (id.includes('NovelDetail') || id.includes('novel-detail/') || 
                id.includes('ModuleChapters') || id.includes('ModuleForm') || 
                id.includes('ModuleList') || id.includes('NovelInfo')) {
              return 'novel-detail';
            }
            
            // Admin and dashboard components
            if (id.includes('Admin') || id.includes('Dashboard') || 
                id.includes('Management') || id.includes('TopUp')) {
              return 'admin';
            }
            
            // User profile and settings
            if (id.includes('UserProfile') || id.includes('UserBookmarks') || 
                id.includes('ChangePassword') || id.includes('pages/')) {
              return 'user-pages';
            }
            
            // Comments and interactions
            if (id.includes('Comment') || id.includes('Rating') || 
                id.includes('Bookmark') || id.includes('Modal')) {
              return 'interactions';
            }
            
            // Chapter reading components
            if (id.includes('Chapter') && !id.includes('ModuleChapters')) {
              return 'chapter-reader';
            }
            
            // Novel listing and browsing
            if (id.includes('NovelList') || id.includes('HotNovels') || 
                id.includes('NovelDirectory') || id.includes('OLN')) {
              return 'novel-browse';
            }
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
      ],
      // Force Vite to use a single version of React
      force: true
    }
  };
});