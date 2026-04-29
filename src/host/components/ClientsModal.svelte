<script lang="ts">
  let { onclose, port }: { onclose: () => void; port: number | null } = $props()

  interface ClientInfo {
    ip: string
    device: string
    connectedAt: string
  }

  let clients = $state<ClientInfo[]>([])
  let loading = $state(true)
  let pollInterval: ReturnType<typeof setInterval> | null = null

  async function fetchClients() {
    if (!port) return
    try {
      const res = await fetch(`http://localhost:${port}/api/clients`)
      if (res.ok) clients = await res.json()
    } catch { /* server not ready */ }
    loading = false
  }

  $effect(() => {
    fetchClients()
    pollInterval = setInterval(fetchClients, 3000)
    return () => { if (pollInterval) clearInterval(pollInterval) }
  })

  function timeAgo(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m`
    return `${Math.floor(s / 3600)}h`
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose()
  }
</script>

<svelte:window onkeydown={handleKey} />

<div class="overlay" onclick={onclose} onkeydown={(e) => e.key === 'Escape' && onclose()} role="presentation" tabindex="-1">
  <div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-header">
      <h2 class="modal-title">Connected Controllers</h2>
      <button class="close-btn" onclick={onclose} aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="modal-body">
      {#if loading}
        <p class="empty">Loading…</p>
      {:else if clients.length === 0}
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>
          </svg>
          <p>No controllers connected</p>
          <p class="hint">Open {`http://praise.local`} on a phone or tablet</p>
        </div>
      {:else}
        <ul class="client-list">
          {#each clients as client}
            <li class="client-item">
              <div class="client-icon">
                {#if /iPhone/i.test(client.device)}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
                {:else if /iPad|Tablet/i.test(client.device)}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 18h.01"/></svg>
                {:else if /Android/i.test(client.device)}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 18V9a6 6 0 0 1 12 0v9"/><rect x="4" y="15" width="16" height="6" rx="1"/><path d="M8 15v3M16 15v3M4 18h16"/></svg>
                {:else}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                {/if}
              </div>
              <div class="client-info">
                <span class="client-device">{client.device}</span>
                <span class="client-ip">{client.ip}</span>
              </div>
              <span class="client-time">{timeAgo(client.connectedAt)} ago</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
  }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    width: 100%;
    max-width: 380px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
    border-bottom: 1px solid var(--border);
  }

  .modal-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text);
  }

  .close-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--surface-2);
    color: var(--text-dim);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: color 0.15s;
  }
  .close-btn:hover { color: var(--text); }
  .close-btn svg { width: 14px; height: 14px; }

  .modal-body { padding: 8px 0; min-height: 80px; }

  .empty { padding: 24px; text-align: center; color: var(--text-dim); font-size: 0.85rem; margin: 0; }

  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 24px; color: var(--text-dim); text-align: center; }
  .empty-state svg { width: 40px; height: 40px; opacity: 0.35; }
  .empty-state p { margin: 0; font-size: 0.85rem; }
  .hint { font-size: 0.75rem !important; opacity: 0.6; }

  .client-list { list-style: none; margin: 0; padding: 0; }

  .client-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 18px;
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;
  }
  .client-item:last-child { border-bottom: none; }
  .client-item:hover { background: var(--surface-2); }

  .client-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--primary-dim);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .client-icon svg { width: 20px; height: 20px; }

  .client-info { flex: 1; min-width: 0; }
  .client-device { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text); }
  .client-ip { display: block; font-size: 0.72rem; color: var(--text-dim); font-family: monospace; margin-top: 1px; }

  .client-time { font-size: 0.7rem; color: var(--text-dim); flex-shrink: 0; }
</style>
