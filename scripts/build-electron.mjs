/**
 * Bundles electron/main.ts and electron/preload.ts into dist/electron/
 * using esbuild (CJS format, all deps inlined except 'electron' itself).
 */
import { build } from 'esbuild'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const base = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
  sourcemap: false,
  minify: false,
}

await Promise.all([
  // main.ts uses import.meta.url for __dirname — inject a CJS-safe polyfill
  build({
    ...base,
    entryPoints: [resolve(root, 'electron/main.ts')],
    outfile: resolve(root, 'dist/electron/main.cjs'),
    define: { 'import.meta.url': '__importMetaUrl' },
    banner: { js: `const __importMetaUrl = require('url').pathToFileURL(__filename).href;` },
  }),
  // preload.ts has no import.meta usage — no banner needed
  build({
    ...base,
    entryPoints: [resolve(root, 'electron/preload.ts')],
    outfile: resolve(root, 'dist/electron/preload.cjs'),
  }),
])

console.log('✓ Electron main + preload bundled → dist/electron/')
