import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  base: '/AFM-26-MVP/',
  resolve: {
    alias: {
      '@engine': path.resolve(currentDirectory, '../src'),
    },
  },
  server: {
    host: true,
  },
})
