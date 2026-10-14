import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev:https` serves the same app over self-signed HTTPS on 5234,
// because the tablet's mic only works on a secure page.
export default defineConfig(({ mode }) => {
  const https = mode === 'https';
  return {
    base: './',
    plugins: [react(), ...(https ? [basicSsl()] : [])],
    server: { port: https ? 5234 : 5233, host: true, strictPort: true },
    preview: { port: 5233, host: true },
  };
});
