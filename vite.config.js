import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    watch: {
      // Ignora pastas bloqueadas/geradas que causam EBUSY no Windows
      ignored: ['**/.vs/**', '**/node_modules/**', '**/.git/**'],
    },
  },
})