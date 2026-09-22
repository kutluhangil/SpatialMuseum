import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mediaDevServer } from './vite/mediaDevServer.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), mediaDevServer()],
  server: { port: 5173, strictPort: true },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
