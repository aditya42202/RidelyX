import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
const envFile = resolve(fileURLToPath(new URL('.', import.meta.url)), '.env.example')
const env = dotenv.config({ path: envFile }).parsed || {}
const clientEnv = Object.fromEntries(
  Object.entries(env)
    .filter(([key]) => key.startsWith('VITE_'))
    .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
)

export default defineConfig({
  root: 'client',
  envDir: 'client/env-disabled',
  define: clientEnv,
  plugins: [react(),
    tailwindcss()
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': 'http://localhost:4000',
    },
  },
})
