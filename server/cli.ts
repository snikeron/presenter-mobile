// @ts-ignore — no type declarations for qrcode-terminal
import qrcode from 'qrcode-terminal'

// ANSI helpers
const R  = '\x1b[0m'
const B  = '\x1b[1m'
const D  = '\x1b[2m'
const G  = '\x1b[32m'
const C  = '\x1b[36m'
const Y  = '\x1b[33m'
const W  = '\x1b[97m'
const W40 = '\x1b[38;5;147m'  // soft lavender — matches app primary colour

export function printBanner() {
  console.log()
  console.log(`  ${B}${W40}🎵  PraisePresenter${R}`)
  console.log(`  ${D}${'─'.repeat(42)}${R}`)
  console.log()
}

export function printLibraryInfo(count: number, dir: string) {
  const rel = dir.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', '')
  console.log(`  📚  ${B}${count} song${count === 1 ? '' : 's'}${R} ${D}loaded from ${rel}${R}`)
}

export function warnPortFallback(from: number, to: number) {
  console.log(`  ${Y}⚡  Port ${from} in use — falling back to ${to}${R}`)
}

export async function printUrls(port: number, localIp: string | null) {
  const p    = port === 80 ? '' : `:${port}`
  const mdns = `http://praise.local${p}`
  const ip   = localIp ? `http://${localIp}${p}` : null

  console.log()
  console.log(`  ${G}${B}✓  Ready${R}`)
  console.log()

  // ── This machine (host) ──────────────────────────────────────────────────
  console.log(`  ${D}On this machine:${R}`)
  console.log(`  ${B}${W}  http://localhost${p}/display${R}  ${D}← open in browser for projection${R}`)
  console.log()

  // ── Other devices (mobile controller) ───────────────────────────────────
  console.log(`  ${D}On mobile (same network):${R}`)
  console.log(`  ${B}${C}  ${mdns}${R}  ${D}← controller${R}`)
  if (ip) {
    console.log(`  ${D}  ${ip}  ← direct IP fallback${R}`)
  }
  console.log()

  // ── QR code — always uses praise.local for cross-interface reliability ───
  console.log(`  ${D}Scan to open on your phone:${R}`)
  const qr: string = await generateQr(mdns)
  qr.split('\n').forEach(line => process.stdout.write('  ' + line + '\n'))
}

export function warnNoLocalIp() {
  console.warn(`  ${Y}⚠️   No LAN IP found — mDNS advertisement skipped; praise.local may not resolve${R}`)
}

function generateQr(url: string): Promise<string> {
  return new Promise(resolve => {
    qrcode.generate(url, { small: true }, (qr: string) => resolve(qr))
  })
}
