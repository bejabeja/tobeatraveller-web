import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tobeatraveller/shared': path.resolve(__dirname, '../shared/src/index.js'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['redux', 'react-redux', '@reduxjs/toolkit', 'redux-thunk'],
          'vendor-map': ['leaflet', 'react-leaflet'],
          'vendor-ui': ['react-icons', 'react-hot-toast'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-utils': ['lodash'],
        }
      }
    }
  }
})
