// client/build.ts
import { copy, emptyDir } from '@std/fs';

console.log('🧹 Cleaning dist directory...');
await emptyDir('./dist');

console.log('📁 Copying public files to dist...');
await copy('./public', './dist', { overwrite: true });

console.log('📦 Bundling application...');
const bundle = new Deno.Command('deno', {
  args: [
    'bundle',
    '--platform',
    'browser',
    '--output',
    'dist/bundle.js',
    '--sourcemap=external',
    'src/main.ts',
  ],
  stdout: 'inherit',
  stderr: 'inherit',
});

const { code } = await bundle.output();

if (code === 0) {
  console.log('✅ Build complete!');
} else {
  console.error('❌ Build failed!');
  Deno.exit(code);
}
