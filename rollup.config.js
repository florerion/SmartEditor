import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/md-editor.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    {
      file: 'dist/md-editor.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    {
      file: 'dist/md-editor.iife.js',
      format: 'iife',
      name: 'MdEditor',
      sourcemap: true,
    },
  ],
  plugins: [
    resolve({ browser: true }),
    commonjs(),
  ],
};
