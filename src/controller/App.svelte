<script lang="ts">
  import { onMount } from 'svelte'
  import { connect } from './lib/ws.js'
  import { appState } from './lib/state.svelte.js'
  import LibraryTab from './components/LibraryTab.svelte'
  import SetlistTab from './components/SetlistTab.svelte'
  import ControlsTab from './components/ControlsTab.svelte'

  onMount(() => {
    connect()
  })
</script>

<div class="app">
  <!-- Status bar -->
  <header class="status-bar">
    <span class="app-name">PraisePresenter</span>
    <span class="connection-badge" class:connected={appState.connected}>
      {appState.connected ? 'Live' : 'Connecting…'}
    </span>
  </header>

  <!-- Main content area -->
  <main class="content">
    {#if appState.activeTab === 'library'}
      <LibraryTab />
    {:else if appState.activeTab === 'setlist'}
      <SetlistTab />
    {:else}
      <ControlsTab />
    {/if}
  </main>

  <!-- Bottom tab bar -->
  <nav class="tab-bar">
    <button
      class="tab"
      class:active={appState.activeTab === 'library'}
      onclick={() => (appState.activeTab = 'library')}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <span>Library</span>
    </button>

    <button
      class="tab"
      class:active={appState.activeTab === 'setlist'}
      onclick={() => (appState.activeTab = 'setlist')}
    >
      <!-- Badge for setlist count -->
      <div class="tab-icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </svg>
        {#if appState.presentation.setlist.length > 0}
          <span class="badge">{appState.presentation.setlist.length}</span>
        {/if}
      </div>
      <span>Setlist</span>
    </button>

    <button
      class="tab"
      class:active={appState.activeTab === 'controls'}
      onclick={() => (appState.activeTab = 'controls')}
    >
      <div class="tab-icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
        {#if appState.presentation.isBlackout}
          <span class="badge danger">⬛</span>
        {:else if appState.presentation.isBlank}
          <span class="badge warn">○</span>
        {/if}
      </div>
      <span>Display</span>
    </button>
  </nav>
</div>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow-x: hidden;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
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

  :global(input) {
    font: inherit;
    color: inherit;
  }

  :global(#app) {
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

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
    --tab-h: 64px;
    --status-h: 48px;
    --radius: 10px;
    --radius-sm: 7px;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
    background: var(--bg);
    overflow-x: hidden;
  }

  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: var(--status-h);
    background: linear-gradient(to bottom, var(--surface-2), var(--surface));
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .app-name {
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--primary);
    text-transform: uppercase;
  }

  .connection-badge {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 999px;
    background: rgba(224, 79, 79, 0.15);
    color: var(--danger);
    letter-spacing: 0.03em;
    transition: all 0.3s;
  }

  .connection-badge.connected {
    background: rgba(56, 184, 96, 0.15);
    color: var(--green);
  }

  .content {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .tab-bar {
    display: flex;
    height: var(--tab-h);
    background: linear-gradient(to bottom, var(--surface), var(--surface-2));
    border-top: 1px solid var(--border);
    flex-shrink: 0;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .tab {
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

  .tab.active {
    color: var(--primary);
  }

  .tab.active::before {
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

  .tab svg {
    width: 22px;
    height: 22px;
  }

  .tab span {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .tab-icon-wrap {
    position: relative;
    display: flex;
  }

  .badge {
    position: absolute;
    top: -6px;
    right: -8px;
    min-width: 17px;
    height: 17px;
    border-radius: 999px;
    background: var(--primary);
    color: #000;
    font-size: 0.6rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }

  .badge.danger {
    background: var(--danger);
    color: #fff;
    font-size: 0.55rem;
  }

  .badge.warn {
    background: var(--warn);
    color: #000;
  }
</style>
