import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { vaultPlugin } from './server/vault.mjs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    vaultPlugin()
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true
  }
});
