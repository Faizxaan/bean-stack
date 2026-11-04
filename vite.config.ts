import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Vendor chunk-splitting (2026-11-04 polish): keeps the initial
        // app chunk below the 800 KB warning. Topic Markdown bodies are
        // already split per file via import.meta.glob; page components
        // are lazy-loaded in App.tsx.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'highlight.js'],
          'vendor-motion': ['framer-motion'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
