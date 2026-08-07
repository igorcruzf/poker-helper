import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Pré-empacota tudo já na subida. Sem isso o Vite descobre dependências
  // conforme elas aparecem e regera os pacotes no meio da sessão; uma aba
  // aberta desde antes fica com o React antigo enquanto um `lazy()` importa o
  // novo, e a tela quebra com "Cannot read properties of null (reading
  // 'useState')" — dois Reacts, dispatcher nenhum.
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', '@supabase/supabase-js'],
  },
  server: {
    watch: {
      // Ignora pastas bloqueadas/geradas que causam EBUSY no Windows
      ignored: ['**/.vs/**', '**/node_modules/**', '**/.git/**'],
    },
  },
  test: {
    // Dois conjuntos: a lógica pura roda em node (mais rápido, sem DOM) e os
    // componentes em jsdom. A extensão do arquivo decide qual é qual.
    projects: [
      {
        extends: true,
        test: { name: 'logica', include: ['src/**/*.test.js'], environment: 'node' },
      },
      {
        extends: true,
        test: {
          name: 'componentes',
          include: ['src/**/*.test.jsx'],
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.js'],
        },
      },
    ],
  },
})
