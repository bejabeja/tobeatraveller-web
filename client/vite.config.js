import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
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
