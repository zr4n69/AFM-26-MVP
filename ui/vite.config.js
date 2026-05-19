import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/AFM-26-MVP/',
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, '../src'),
    },
  },
  server: {
    host: true,
  },
})
