import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/fitcheck/',
  server: {
    proxy: {
      '/api': 'http://localhost:3456',
    },
  },
})
