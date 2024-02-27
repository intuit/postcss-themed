import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['./__tests__/**/*.(spec|test).[jt]s?(x)'],
    exclude: [
      '**/node_modules/**',
      '**/test-component-themes-js/**',
      '**/test-component-themes-ts/**',
      '**/test-modern-themes-ts/**',
    ],
  },
});
