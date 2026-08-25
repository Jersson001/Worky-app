import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    // Ojo: nada de `define` con claves. Lo que se pone ahí queda incrustado en
    // el bundle y es legible por cualquiera. GEMINI_API_KEY es ahora un secreto
    // de la Edge Function `gemini`.
    return {
      server: {
        port: parseInt(process.env.PORT || '5173'),
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
