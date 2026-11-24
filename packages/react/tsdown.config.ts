import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/element.ts'],
  format: 'esm',
  dts: true,
  platform: 'browser',
  deps: { neverBundle: ['react', 'react/jsx-runtime'] },
});
