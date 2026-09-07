import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { vaultPlugin } from './server/vault.mjs';
import { runtimePlugin } from './server/runtime.mjs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    vaultPlugin(),
    runtimePlugin()
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true
  }
});
