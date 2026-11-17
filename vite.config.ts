/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    // Read by scripts/check-size.mjs to measure the entry chunk (constitution Principle II).
    manifest: true,
    // The lazy 3D chunk (three.js + R3F) is large by nature; the entry budget is enforced by
    // `npm run size` instead of this generic warning.
    chunkSizeWarningLimit: 1400,
  },
  test: {
    setupFiles: ['tests/setup.ts'],
    // Component tests need a DOM; unit tests stay in plain Node.
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: {
          name: 'component',
          include: ['tests/component/**/*.test.tsx'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
