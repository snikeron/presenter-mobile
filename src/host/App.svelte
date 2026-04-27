<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import QRCode from 'qrcode'

  // ── State ──────────────────────────────────────────────────────────────────

  let port = $state<number | null>(null)
  let localIp = $state<string | null>(null)
  let lyricsDir = $state('')
  let connectionCount = $state(0)
  let displayVisible = $state(false)
  let qrDataUrl = $state('')
  let songCount = $state<number | null>(null)
  let statusMessage = $state('')
  let mountError = $state('')

  const mdnsUrl = $derived(port != null ? `http://praise.local${port === 80 ? '' : `:${port}`}` : '')
  const ipUrl = $derived(localIp && port != null ? `http://${localIp}${port === 80 ? '' : `:${port}`}` : '')

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  let cleanupCountListener: (() => void) | null = null
  let pollInterval: ReturnType<typeof setInterval> | null = null

  onMount(async () => {
    try {
      const info = await window.electronAPI.getServerInfo()
      port = info.port
      localIp = info.localIp

      const config = await window.electronAPI.getConfig()
      lyricsDir = config.lyricsDir

      displayVisible = await window.electronAPI.getDisplayVisible()

      const url = `http://praise.local${info.port === 80 ? '' : `:${info.port}`}`
      const svg = await QRCode.toString(url, {
        type: 'svg',
        margin: 1,
        color: { dark: '#ffffff', light: '#00000000' },
      })
      qrDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    } catch (err) {
      mountError = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      console.error('[host] mount error:', err)
    }

    // Live connection count via IPC events
    cleanupCountListener = window.electronAPI.onConnectionCount(count => {
      connectionCount = count
    })

    // Poll /api/status for song count and connection count fallback
    const poll = async () => {
      try {
        const res = await fetch(`http://localhost:${port}/api/status`)
        if (res.ok) {
          const data = await res.json()
          songCount = null // will be set by library endpoint
          connectionCount = data.connectionCount
        }
        const lib = await fetch(`http://localhost:${port}/api/library`)
        if (lib.ok) {
          const songs = await lib.json()
          songCount = songs.length
        }
      } catch { /* server not ready yet */ }
    }

    await poll()
    pollInterval = setInterval(poll, 5000)
  })

  onDestroy(() => {
    cleanupCountListener?.()
    if (pollInterval) clearInterval(pollInterval)
  })

  // ── Actions ────────────────────────────────────────────────────────────────

  async function changeFolder() {
    const dir = await window.electronAPI.selectLyricsFolder()
    if (!dir) return
    const count = await window.electronAPI.setLyricsDir(dir)
    lyricsDir = dir
    songCount = count
    statusMessage = `Loaded ${count} song${count === 1 ? '' : 's'} from new folder`
    setTimeout(() => (statusMessage = ''), 3000)
  }

  function toggleDisplay() {
    if (displayVisible) {
      window.electronAPI.hideDisplay()
    } else {
      window.electronAPI.showDisplay()
    }
    displayVisible = !displayVisible
  }
</script>

<div class="panel">
  <!-- Header -->
  <header class="header">
    <span class="logo">PraisePresenter</span>
    <span class="connection-pill" class:connected={connectionCount > 0}>
      {connectionCount} controller{connectionCount === 1 ? '' : 's'}
    </span>
  </header>

  <!-- QR Code -->
  <section class="qr-section">
    {#if qrDataUrl}
      <img class="qr" src={qrDataUrl} alt="QR code" />
    {:else if mountError}
      <div class="qr-placeholder error">{mountError}</div>
    {:else}
      <div class="qr-placeholder">Generating…</div>
    {/if}
    <p class="qr-hint">
      {#if mountError}
        Error — press Ctrl+Shift+I for DevTools
      {:else}
        Scan to open controller on your phone
      {/if}
    </p>
  </section>

  <!-- URLs -->
  <section class="card">
    <div class="row">
      <span class="label">mDNS</span>
      <span class="url primary">{mdnsUrl || '—'}</span>
    </div>
    {#if ipUrl}
      <div class="row">
        <span class="label">Direct IP</span>
        <span class="url">{ipUrl}</span>
      </div>
    {/if}
    <div class="row">
      <span class="label">Display</span>
      <span class="url dim">http://localhost{port === 80 ? '' : `:${port}`}/display</span>
    </div>
  </section>

  <!-- Library -->
  <section class="card">
    <div class="section-title">Song Library</div>
    <div class="row">
      <span class="label">Songs</span>
      <span class="value">{songCount ?? '—'}</span>
    </div>
    <div class="folder-row">
      <span class="folder-path" title={lyricsDir}>{lyricsDir || '—'}</span>
      <button class="btn-sm" onclick={changeFolder}>Change…</button>
    </div>
    {#if statusMessage}
      <div class="status-msg">{statusMessage}</div>
    {/if}
  </section>

  <!-- Display window -->
  <section class="card">
    <div class="section-title">Projection Display</div>
    <div class="row">
      <span class="label">Window</span>
      <span class="value" class:active={displayVisible}>
        {displayVisible ? 'Visible' : 'Hidden'}
      </span>
    </div>
    <button class="btn-toggle" onclick={toggleDisplay}>
      {displayVisible ? 'Hide Display Window' : 'Show Display Window'}
    </button>
  </section>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; }

  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    background: #0c0c0d;
    color: #f0ede8;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  :global(#app) { height: 100%; }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    height: 100%;
    overflow-y: auto;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 16px;
    background: linear-gradient(to bottom, #1e1e22, #161618);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.07);
  }

  .logo {
    font-size: 0.85rem;
    font-weight: 700;
    color: #e8a020;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .connection-pill {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 999px;
    background: rgba(224, 79, 79, 0.15);
    color: #e04f4f;
    letter-spacing: 0.03em;
    transition: all 0.3s;
  }

  .connection-pill.connected {
    background: rgba(56, 184, 96, 0.15);
    color: #38b860;
  }

  .qr-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 20px 16px 16px;
    background: #161618;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.07);
  }

  .qr {
    width: 200px;
    height: 200px;
    border-radius: 6px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .qr-placeholder {
    width: 200px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1e1e22;
    border-radius: 6px;
    font-size: 0.8rem;
    color: #5c5850;
    padding: 12px;
    text-align: center;
  }

  .qr-placeholder.error {
    color: #e04f4f;
    font-size: 0.7rem;
    word-break: break-all;
  }

  .qr-hint {
    margin: 0;
    font-size: 0.72rem;
    color: #5c5850;
    text-align: center;
  }

  .card {
    background: #161618;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-title {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: #e8a020;
    opacity: 0.7;
  }

  .row {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .label {
    font-size: 0.72rem;
    color: #5c5850;
    flex-shrink: 0;
    width: 64px;
  }

  .url {
    font-size: 0.78rem;
    color: #f0ede8;
    word-break: break-all;
  }

  .url.primary { color: #e8a020; font-weight: 600; }
  .url.dim { color: #5c5850; }

  .value {
    font-size: 0.82rem;
    color: #f0ede8;
    font-weight: 600;
  }

  .value.active { color: #38b860; }

  .folder-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .folder-path {
    flex: 1;
    font-size: 0.72rem;
    color: #5c5850;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-sm {
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: 6px;
    background: #1e1e22;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #f0ede8;
    font-size: 0.75rem;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }

  .btn-sm:hover { background: #252528; }

  .btn-toggle {
    padding: 9px 14px;
    border-radius: 8px;
    background: #1e1e22;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #f0ede8;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
    text-align: center;
  }

  .btn-toggle:hover { background: #252528; }

  .status-msg {
    font-size: 0.72rem;
    color: #38b860;
    padding: 4px 0;
  }
</style>
