import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  tsconfig: './tsconfig.build.json',
  format: ['cjs', 'esm'],
  outExtension({ format }) {
    return {
      js: `.${format}.js`,
    };
  },
});
