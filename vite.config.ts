import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { vaultPlugin } from './server/vault.mjs';
import { runtimePlugin } from './server/runtime.mjs';
import { agentEnvPlugin } from './server/agentEnv.mjs';
import { agentPlugin } from './server/agent.mjs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    vaultPlugin(),
    runtimePlugin(),
    agentEnvPlugin(),
    agentPlugin()
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true
  }
});
