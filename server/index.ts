import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import fastifyCors from '@fastify/cors'
import { resolve, dirname, extname } from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'
import { loadLibrary, getLyricsDir, invalidateCache } from './library.js'
import { registerClient, setLibrary, broadcastLibrary } from './websocket.js'
import { startMdns } from './mdns.js'
import { printBanner, printLibraryInfo, printUrls, warnPortFallback, warnNoLocalIp } from './cli.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PREFERRED_PORT = parseInt(process.env.PORT ?? '80')
const HOST = process.env.HOST ?? '0.0.0.0'
// Default to production — dev mode must be opted in explicitly via NODE_ENV=development
const isDev = process.env.NODE_ENV === 'development'
const DIST = resolve(__dirname, '../dist')

const fastify = Fastify({ logger: { level: 'error' } })

await fastify.register(fastifyCors, { origin: true })
await fastify.register(fastifyWebsocket)

// ── REST API ──────────────────────────────────────────────────────────────────

fastify.get('/api/library', async () => loadLibrary())

fastify.post('/api/library/reload', async () => {
  invalidateCache()
  const songs = await loadLibrary(true)
  broadcastLibrary(songs)
  return { count: songs.length }
})

fastify.get('/api/info', async () => ({ lyricsDir: getLyricsDir(), port: activePort }))

// ── WebSocket ─────────────────────────────────────────────────────────────────

fastify.get('/ws', { websocket: true }, (socket) => {
  registerClient(socket as any)
})

// ── Static / SPA ─────────────────────────────────────────────────────────────

if (!isDev) {
  // Hashed JS/CSS bundles — dedicated prefix, no route conflicts
  await fastify.register(fastifyStatic, {
    root: resolve(DIST, 'assets'),
    prefix: '/assets/',
    decorateReply: true,
  })

  async function serveHtml(filename: string, reply: any) {
    try {
      const html = await readFile(resolve(DIST, filename), 'utf-8')
      reply.type('text/html').send(html)
    } catch {
      reply.code(404).send('Page not found — did you run `npm run build`?')
    }
  }

  // ── HTML pages — registered FIRST so they win over the asset catch-all ──────
  fastify.get('/', (_, reply) => serveHtml('index.html', reply))
  fastify.get('/display', (_, reply) => serveHtml('display.html', reply))
  fastify.get('/display/', (_, reply) => serveHtml('display.html', reply))

  // ── Root-level public assets (icon.svg, favicon.ico, etc.) ──────────────────
  const MIME: Record<string, string> = {
    '.svg':         'image/svg+xml',
    '.ico':         'image/x-icon',
    '.png':         'image/png',
    '.webmanifest': 'application/manifest+json',
    '.json':        'application/json',
    '.txt':         'text/plain',
  }

  // Registered AFTER the explicit HTML routes so /display etc. are never caught here
  fastify.get('/:file', async (req: any, reply) => {
    const file: string = req.params.file
    const ext = extname(file)
    const mime = MIME[ext]
    if (!mime) return reply.callNotFound()
    try {
      reply.type(mime).send(await readFile(resolve(DIST, file)))
    } catch {
      reply.callNotFound()
    }
  })

  fastify.setNotFoundHandler((req, reply) => {
    if (req.method !== 'GET' || req.url.startsWith('/api/') || req.url.startsWith('/assets/')) {
      return reply.code(404).send({ error: 'Not Found' })
    }
    serveHtml('index.html', reply)
  })
}

// ── Startup ───────────────────────────────────────────────────────────────────

printBanner()

try {
  const songs = await loadLibrary()
  setLibrary(songs)
  printLibraryInfo(songs.length, getLyricsDir())
} catch (err) {
  console.warn('  ⚠️  Failed to load library:', err)
}

async function listenWithFallback(preferred: number, host: string): Promise<number> {
  const candidates = preferred === 80
    ? [80, 8080, 8081, 8082]
    : Array.from({ length: 10 }, (_, i) => preferred + i)

  for (const port of candidates) {
    try {
      await fastify.listen({ port, host })
      return port
    } catch (err: any) {
      const retryable = err?.code === 'EADDRINUSE' || err?.code === 'EACCES'
      if (retryable && port !== candidates[candidates.length - 1]) {
        warnPortFallback(port, candidates[candidates.indexOf(port) + 1])
        continue
      }
      throw err
    }
  }
  throw new Error('No available port found')
}

const activePort = await listenWithFallback(PREFERRED_PORT, HOST)
const localIp = startMdns(activePort)

if (!localIp) warnNoLocalIp()
await printUrls(activePort, localIp)
