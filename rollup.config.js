import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Rollup plugin: copies vendor/drawio/ → dist/drawio/ after build.
 * Emits a warning (not an error) when vendor/drawio/ is absent so that
 * a plain `npm run build` without the draw.io download still succeeds.
 */
function copyDrawio() {
  let done = false;
  return {
    name: 'copy-drawio',
    closeBundle() {
      if (done) return;
      done = true;
      const src  = join(__DIR, 'vendor', 'drawio');
      const dest = join(__DIR, 'dist',   'drawio');
      if (!existsSync(src)) {
        this.warn('vendor/drawio/ not found; run `npm run drawio:download` to enable offline draw.io support.');
        return;
      }
      cpSync(src, dest, { recursive: true });
      console.log('[copy-drawio] vendor/drawio → dist/drawio');
    },
  };
}

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/smart-editor.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    {
      file: 'dist/smart-editor.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    {
      file: 'dist/smart-editor.iife.js',
      format: 'iife',
      name: 'SmartEditor',
      sourcemap: true,
    },
  ],
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    copyDrawio(),
  ],
};
