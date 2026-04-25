import { networkInterfaces } from 'os'
// @ts-ignore — multicast-dns has loose typings
import mDNS from 'multicast-dns'

const HOSTNAME = 'praise.local'

export function startMdns(port: number): string | null {
  const ip = getLocalIpv4()

  // Bind to the specific LAN interface so multicast packets go out on the right
  // adapter — without this, Windows may join the multicast group on loopback only
  const mdns = mDNS({ interface: ip ?? '0.0.0.0' })

  mdns.on('query', (query: any) => {
    const relevant = (query.questions as any[]).some(
      (q: any) => q.name === HOSTNAME && (q.type === 'A' || q.type === 'ANY')
    )
    if (!relevant) return

    if (ip) {
      mdns.respond({
        answers: [{ name: HOSTNAME, type: 'A', ttl: 300, data: ip }],
      })
    }
  })

  // Proactively announce on startup so nearby devices discover us without querying
  if (ip) {
    mdns.respond({
      answers: [{ name: HOSTNAME, type: 'A', ttl: 300, data: ip }],
    })
  }

  mdns.on('error', () => {
    // non-fatal — direct IP / QR code access still works
  })

  return ip
}

export function getLocalIpv4(): string | null {
  const nets = networkInterfaces()
  for (const iface of Object.values(nets)) {
    if (!iface) continue
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address
      }
    }
  }
  return null
}
