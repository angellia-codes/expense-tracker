import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Function form, not the object form: Vite 8 only types this one.
        // Splitting is load-bearing — bundling recharts + xlsx + jspdf into a
        // single chunk makes Rolldown run out of memory while rendering it.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](recharts|d3-|victory-)/.test(id)) return 'charts'
          // dompurify/canvg/html2canvas are jspdf's dependencies, not ours.
          // Named explicitly because otherwise they land in a vendor chunk and
          // every page pays ~95 kB gzip for a PDF export most users never run.
          if (/[\\/]node_modules[\\/](xlsx|jspdf|dompurify|canvg|html2canvas|raf|rgbcolor|stackblur)/.test(id)) return 'export'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('@tanstack')) return 'query'
          return 'vendor-' + (id.split(/[\\/]node_modules[\\/]/).pop() || '').split(/[\\/]/)[0]
        },
      },
    },
  },
})
