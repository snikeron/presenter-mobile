<script lang="ts">
  import { send } from '../lib/ws.js'
  import { appState } from '../lib/state.svelte.js'
  import SongSlides from './SongSlides.svelte'

  let expandedId = $state<string | null>(null)

  // Auto-expand the currently playing song
  $effect(() => {
    const id = appState.presentation.currentSongId
    if (id && appState.presentation.setlist.includes(id)) {
      expandedId = id
    }
  })

  function toggle(id: string) {
    expandedId = expandedId === id ? null : id
  }

  function clearSetlist() {
    if (confirm('Clear the whole setlist?')) {
      send({ type: 'setlist:clear' })
      expandedId = null
    }
  }
</script>

<div class="setlist">
  <div class="toolbar">
    <span class="toolbar-title">
      {appState.setlistSongs.length === 0
        ? 'No songs'
        : `${appState.setlistSongs.length} song${appState.setlistSongs.length === 1 ? '' : 's'}`}
    </span>
    {#if appState.setlistSongs.length > 0}
      <button class="clear-btn" onclick={clearSetlist}>Clear all</button>
    {/if}
  </div>

  <div class="list">
    {#if appState.setlistSongs.length === 0}
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </svg>
        <p>Your setlist is empty</p>
        <p class="hint">Add songs from the Library tab</p>
      </div>
    {:else}
      {#each appState.setlistSongs as song, idx (song.id)}
        {@const isCurrent = appState.presentation.currentSongId === song.id}
        <div class="song-item" class:current={isCurrent}>
          <!-- Row header -->
          <button class="song-row" onclick={() => toggle(song.id)}>
            <span class="index">{idx + 1}</span>
            <div class="song-info">
              <span class="title">{song.title}</span>
              {#if song.artist}
                <span class="artist">{song.artist}</span>
              {/if}
            </div>
            <div class="row-end">
              {#if isCurrent}
                <span class="live-badge">LIVE</span>
              {/if}
              <svg
                class="chevron"
                class:open={expandedId === song.id}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          {#if expandedId === song.id}
            <div class="expanded-panel">
              <SongSlides {song} />
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .setlist {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .toolbar-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .clear-btn {
    font-size: 0.8rem;
    color: var(--danger);
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    background: rgba(255, 107, 107, 0.1);
  }

  .clear-btn:active {
    background: rgba(255, 107, 107, 0.2);
  }

  .list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    -webkit-overflow-scrolling: touch;
  }

  .song-item {
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--border);
    transition: border-color 0.2s;
  }

  .song-item.current {
    border-color: rgba(232, 160, 32, 0.3);
    box-shadow: inset 3px 0 0 var(--primary);
  }

  .song-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    text-align: left;
    width: 100%;
  }

  .song-row:active {
    background: var(--surface-2);
  }

  .index {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-dim);
    width: 18px;
    text-align: center;
    flex-shrink: 0;
  }

  .song-info {
    flex: 1;
    min-width: 0;
  }

  .title {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .artist {
    display: block;
    font-size: 0.75rem;
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-end {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .live-badge {
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #000;
    background: var(--primary);
    padding: 2px 7px;
    border-radius: 999px;
    text-transform: uppercase;
    animation: live-glow 2s ease-in-out infinite;
  }

  @keyframes live-glow {
    0%, 100% { box-shadow: 0 0 0 0 transparent; }
    50% { box-shadow: 0 0 8px var(--primary-glow); }
  }

  .chevron {
    width: 18px;
    height: 18px;
    color: var(--text-dim);
    transition: transform 0.2s;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .expanded-panel {
    border-top: 1px solid var(--border);
    padding: 10px;
    background: var(--bg);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 48px 24px;
    color: var(--text-dim);
    text-align: center;
  }

  .empty-state svg {
    width: 48px;
    height: 48px;
    opacity: 0.4;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.9rem;
  }

  .hint {
    font-size: 0.8rem !important;
    opacity: 0.7;
  }
</style>
