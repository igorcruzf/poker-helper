import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Ignora pastas bloqueadas/geradas que causam EBUSY no Windows
      ignored: ['**/.vs/**', '**/node_modules/**', '**/.git/**'],
    },
  },
})
