import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Fuso fixo: teste de **instante** rende conforme o relógio local, então sem
    // isto ele passa na máquina do dev (UTC-3) e muda de resultado no CI/Railway
    // (UTC) — verde ou vermelho por acidente de ambiente. Todos os usuários do
    // ERP estão em UTC-3; é este o fuso que interessa reproduzir.
    // Ver CLAUDE.md, "Datas — dia de calendário vs instante".
    env: { TZ: 'America/Sao_Paulo' },
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.tsx', '**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
