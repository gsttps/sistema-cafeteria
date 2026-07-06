import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Librerías base en un chunk propio: cambian mucho menos que el
          // código de la app, así el navegador las conserva entre deploys
          // (recharts NO va aquí: solo la carga la página lazy de Balances)
          vendor: ['react', 'react-dom', 'react-router-dom', 'axios', 'sonner'],
        },
      },
    },
  },
});
