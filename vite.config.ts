import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5233, host: true, strictPort: true },
  preview: { port: 5233, host: true },
});
