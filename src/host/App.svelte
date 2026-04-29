<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import QRCode from 'qrcode'
  import { connect } from './lib/ws.js'
  import { appState } from './lib/state.svelte.js'
  import LibraryPanel from './components/LibraryPanel.svelte'
  import SetlistPanel from './components/SetlistPanel.svelte'
  import DisplayPanel from './components/DisplayPanel.svelte'
  import ClientsModal from './components/ClientsModal.svelte'

  // ── Server / session state ─────────────────────────────────────────────────

  let port = $state<number | null>(null)
  let localIp = $state<string | null>(null)
  let lyricsDir = $state('')
  let displayVisible = $state(false)
  let qrDataUrl = $state('')
  let songCount = $state<number | null>(null)
  let statusMessage = $state('')
  let mountError = $state('')

  // ── UI state ───────────────────────────────────────────────────────────────

  type Tab = 'info' | 'library' | 'setlist' | 'display'
  let activeTab = $state<Tab>('library')
  let showClientsModal = $state(false)
  let controllerCount = $state(0)

  // ── Derived ────────────────────────────────────────────────────────────────

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

      connect(info.port)

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

    const fetchControllerCount = async () => {
      if (!port) return
      try {
        const res = await fetch(`http://localhost:${port}/api/clients`)
        if (res.ok) controllerCount = (await res.json()).length
      } catch { /* server not ready */ }
    }
    await fetchControllerCount()
    cleanupCountListener = window.electronAPI.onConnectionCount(fetchControllerCount)

    const poll = async () => {
      if (!port) return
      try {
        const lib = await fetch(`http://localhost:${port}/api/library`)
        if (lib.ok) songCount = (await lib.json()).length
      } catch { /* server not ready */ }
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
    statusMessage = `Loaded ${count} song${count === 1 ? '' : 's'}`
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

<!-- ── Shared sidebar/info content (used in sidebar + mobile Info tab) ───── -->
{#snippet infoContent()}
  <div class="sb-qr">
    {#if qrDataUrl}
      <img class="qr-img" src={qrDataUrl} alt="QR code" />
    {:else if mountError}
      <div class="qr-placeholder error">{mountError}</div>
    {:else}
      <div class="qr-placeholder">Generating…</div>
    {/if}
    <p class="qr-hint">
      {#if mountError}Error — press Ctrl+Shift+I{:else}Scan to open controller{/if}
    </p>
  </div>

  <div class="sb-block">
    <p class="sb-kv"><span class="sb-key">mDNS</span><span class="sb-val primary">{mdnsUrl || '—'}</span></p>
    {#if ipUrl}<p class="sb-kv"><span class="sb-key">IP</span><span class="sb-val">{ipUrl}</span></p>{/if}
  </div>

  <div class="sb-divider"></div>

  <div class="sb-block">
    <p class="sb-section-label">Song Library</p>
    <p class="sb-kv">
      <span class="sb-key">Songs</span>
      <span class="sb-val">{songCount ?? '—'}</span>
    </p>
    <div class="sb-folder-row">
      <span class="sb-folder-path" title={lyricsDir}>{lyricsDir || '—'}</span>
      <button class="sb-action-btn" onclick={changeFolder}>Change…</button>
    </div>
    {#if statusMessage}<p class="sb-status">{statusMessage}</p>{/if}
  </div>

  <div class="sb-divider"></div>

  <div class="sb-block">
    <p class="sb-section-label">Projection Display</p>
    <p class="sb-kv">
      <span class="sb-key">Window</span>
      <span class="sb-val" class:green={displayVisible}>{displayVisible ? 'Visible' : 'Hidden'}</span>
    </p>
    <button class="sb-toggle-btn" onclick={toggleDisplay}>
      {displayVisible ? 'Hide Display Window' : 'Show Display Window'}
    </button>
  </div>
{/snippet}

<!-- ── Root ──────────────────────────────────────────────────────────────── -->
<div class="app">

  <!-- Top bar -->
  <header class="topbar">
    <div class="topbar-left">
      <span class="logo">PraisePresenter</span>
      <span class="ws-pill" class:connected={appState.connected}>
        {appState.connected ? 'Live' : 'Connecting…'}
      </span>
    </div>
    <button
      class="controllers-btn"
      class:has-controllers={controllerCount > 0}
      onclick={() => (showClientsModal = true)}
    >
      <span class="ctrl-dot" class:active={controllerCount > 0}></span>
      {controllerCount > 0
        ? `${controllerCount} Controller${controllerCount === 1 ? '' : 's'}`
        : 'Controllers'}
    </button>
  </header>

  <!-- Body: sidebar + main -->
  <div class="body">

    <!-- Sidebar — desktop only -->
    <aside class="sidebar">
      {@render infoContent()}
    </aside>

    <!-- Main content area -->
    <main class="main">

      <!-- Desktop tab bar -->
      <div class="dtabs">
        <button class="dtab" class:active={activeTab === 'library'} onclick={() => (activeTab = 'library')}>
          Library
          {#if appState.library.length > 0}
            <span class="dtab-count">{appState.library.length}</span>
          {/if}
        </button>
        <button class="dtab" class:active={activeTab === 'setlist'} onclick={() => (activeTab = 'setlist')}>
          Setlist
          {#if appState.presentation.setlist.length > 0}
            <span class="dtab-count accent">{appState.presentation.setlist.length}</span>
          {/if}
        </button>
        <button class="dtab" class:active={activeTab === 'display'} onclick={() => (activeTab = 'display')}>
          Display
          {#if appState.presentation.isBlackout}
            <span class="dtab-badge danger">Blackout</span>
          {:else if appState.presentation.isBlank}
            <span class="dtab-badge warn">Blank</span>
          {/if}
        </button>
      </div>

      <!-- Tab content -->
      <div class="tab-content">
        {#if activeTab === 'info'}
          <div class="mobile-info">{@render infoContent()}</div>
        {:else if activeTab === 'library'}
          <LibraryPanel {port} />
        {:else if activeTab === 'setlist'}
          <SetlistPanel />
        {:else if activeTab === 'display'}
          <DisplayPanel />
        {/if}
      </div>

    </main>
  </div>

  <!-- Mobile bottom nav — hidden on desktop -->
  <nav class="mobile-nav">
    <button class="mnav" class:active={activeTab === 'info'} onclick={() => (activeTab = 'info')}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
      </svg>
      <span>Info</span>
    </button>
    <button class="mnav" class:active={activeTab === 'library'} onclick={() => (activeTab = 'library')}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <span>Library</span>
    </button>
    <button class="mnav" class:active={activeTab === 'setlist'} onclick={() => (activeTab = 'setlist')}>
      <div class="mnav-icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
        </svg>
        {#if appState.presentation.setlist.length > 0}
          <span class="mnav-badge">{appState.presentation.setlist.length}</span>
        {/if}
      </div>
      <span>Setlist</span>
    </button>
    <button class="mnav" class:active={activeTab === 'display'} onclick={() => (activeTab = 'display')}>
      <div class="mnav-icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
        </svg>
        {#if appState.presentation.isBlackout}
          <span class="mnav-badge danger">⬛</span>
        {:else if appState.presentation.isBlank}
          <span class="mnav-badge warn">○</span>
        {/if}
      </div>
      <span>Display</span>
    </button>
  </nav>

</div>

<!-- Clients modal -->
{#if showClientsModal}
  <ClientsModal onclose={() => (showClientsModal = false)} {port} />
{/if}

<style>
  /* ── Global resets + CSS variables ──────────────────────────────────────── */

  :global(*, *::before, *::after) {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  :global(button) {
    cursor: pointer;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    padding: 0;
    outline: none;
  }

  :global(input) { font: inherit; color: inherit; }

  :global(#app) { width: 100%; height: 100%; }

  :global(:root) {
    --bg: #0c0c0d;
    --surface: #161618;
    --surface-2: #1e1e22;
    --surface-3: #252528;
    --border: rgba(255, 255, 255, 0.07);
    --primary: #e8a020;
    --primary-dim: rgba(232, 160, 32, 0.12);
    --primary-glow: rgba(232, 160, 32, 0.24);
    --text: #f0ede8;
    --text-mid: #94908a;
    --text-dim: #5c5850;
    --danger: #e04f4f;
    --warn: #e8a020;
    --green: #38b860;
    --radius: 10px;
    --radius-sm: 7px;
    --topbar-h: 46px;
    --mnav-h: 60px;
  }

  /* ── App shell ───────────────────────────────────────────────────────────── */

  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg);
    overflow: hidden;
  }

  /* ── Top bar ─────────────────────────────────────────────────────────────── */

  .topbar {
    height: var(--topbar-h);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    background: linear-gradient(to bottom, var(--surface-2), var(--surface));
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    gap: 12px;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .logo {
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--primary);
    text-transform: uppercase;
    white-space: nowrap;
  }

  .ws-pill {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(224, 79, 79, 0.15);
    color: var(--danger);
    letter-spacing: 0.03em;
    white-space: nowrap;
    transition: all 0.3s;
  }
  .ws-pill.connected {
    background: rgba(56, 184, 96, 0.15);
    color: var(--green);
  }

  .controllers-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    border-radius: 999px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-mid);
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .controllers-btn:hover { background: var(--surface-3); color: var(--text); }
  .controllers-btn.has-controllers { color: var(--text); }

  .ctrl-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-dim);
    transition: background 0.3s;
    flex-shrink: 0;
  }
  .ctrl-dot.active {
    background: var(--green);
    box-shadow: 0 0 6px rgba(56, 184, 96, 0.5);
  }

  /* ── Body ────────────────────────────────────────────────────────────────── */

  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }

  /* ── Sidebar ─────────────────────────────────────────────────────────────── */

  .sidebar {
    display: none; /* shown via media query */
    width: 240px;
    flex-shrink: 0;
    border-right: 1px solid var(--border);
    background: var(--surface);
    overflow-y: auto;
    flex-direction: column;
    gap: 0;
    padding-bottom: 16px;
  }

  /* ── Desktop tab bar ─────────────────────────────────────────────────────── */

  .dtabs {
    display: none;
    align-items: stretch;
    gap: 0;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    padding: 0 8px;
  }

  @media (min-width: 640px) {
    .sidebar { display: flex; }
    .mobile-nav { display: none !important; }
    .dtabs { display: flex; }
  }

  /* ── Main content ────────────────────────────────────────────────────────── */

  .main {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .dtab {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 14px;
    height: 40px;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-dim);
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
    position: relative;
  }
  .dtab:hover { color: var(--text-mid); }
  .dtab.active { color: var(--primary); border-bottom-color: var(--primary); }

  .dtab-count {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--text-dim);
    min-width: 18px;
    text-align: center;
  }
  .dtab-count.accent { background: var(--primary-dim); color: var(--primary); }

  .dtab-badge {
    font-size: 0.6rem;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .dtab-badge.danger { background: rgba(224,79,79,0.15); color: var(--danger); }
  .dtab-badge.warn { background: rgba(232,160,32,0.15); color: var(--warn); }

  /* ── Tab content ─────────────────────────────────────────────────────────── */

  .tab-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .mobile-info {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 16px;
  }

  /* ── Mobile bottom nav ───────────────────────────────────────────────────── */

  .mobile-nav {
    display: flex;
    height: var(--mnav-h);
    background: linear-gradient(to bottom, var(--surface), var(--surface-2));
    border-top: 1px solid var(--border);
    flex-shrink: 0;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .mnav {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: var(--text-dim);
    transition: color 0.15s;
    position: relative;
  }
  .mnav.active { color: var(--primary); }
  .mnav.active::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 28px;
    height: 2px;
    background: var(--primary);
    border-radius: 0 0 3px 3px;
    box-shadow: 0 0 8px var(--primary-glow);
  }
  .mnav svg { width: 21px; height: 21px; }
  .mnav span { font-size: 0.62rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }

  .mnav-icon-wrap { position: relative; display: flex; }
  .mnav-badge {
    position: absolute; top: -5px; right: -7px;
    min-width: 16px; height: 16px; border-radius: 999px;
    background: var(--primary); color: #000;
    font-size: 0.58rem; font-weight: 800;
    display: flex; align-items: center; justify-content: center; padding: 0 3px;
  }
  .mnav-badge.danger { background: var(--danger); color: #fff; }
  .mnav-badge.warn { background: var(--warn); color: #000; }

  /* ── Sidebar / Info content ──────────────────────────────────────────────── */

  .sb-qr {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 16px 12px;
  }

  .qr-img {
    width: 180px;
    height: 180px;
    border-radius: 6px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .qr-placeholder {
    width: 180px;
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-2);
    border-radius: 6px;
    font-size: 0.78rem;
    color: var(--text-dim);
    padding: 12px;
    text-align: center;
  }
  .qr-placeholder.error { color: var(--danger); font-size: 0.68rem; word-break: break-all; }

  .qr-hint {
    margin: 0;
    font-size: 0.68rem;
    color: var(--text-dim);
    text-align: center;
  }

  .sb-block {
    padding: 10px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .sb-divider {
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }

  .sb-section-label {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--primary);
    opacity: 0.7;
    margin: 0 0 2px;
  }

  .sb-kv {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 0;
  }

  .sb-key {
    font-size: 0.7rem;
    color: var(--text-dim);
    width: 48px;
    flex-shrink: 0;
  }

  .sb-val {
    font-size: 0.78rem;
    color: var(--text);
    font-weight: 500;
    word-break: break-all;
    min-width: 0;
  }
  .sb-val.primary { color: var(--primary); font-weight: 600; }
  .sb-val.green { color: var(--green); }

  .sb-folder-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sb-folder-path {
    flex: 1;
    font-size: 0.7rem;
    color: var(--text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .sb-action-btn {
    flex-shrink: 0;
    padding: 3px 9px;
    border-radius: 6px;
    background: var(--surface-2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text);
    font-size: 0.72rem;
    transition: background 0.15s;
  }
  .sb-action-btn:hover { background: var(--surface-3); }

  .sb-toggle-btn {
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text);
    font-size: 0.78rem;
    font-weight: 600;
    width: 100%;
    text-align: center;
    transition: background 0.15s;
  }
  .sb-toggle-btn:hover { background: var(--surface-3); }

  .sb-status {
    font-size: 0.7rem;
    color: var(--green);
    margin: 2px 0 0;
  }
</style>
