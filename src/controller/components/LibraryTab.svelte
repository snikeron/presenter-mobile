<script lang="ts">
  import { send } from '../lib/ws.js'
  import { appState } from '../lib/state.svelte.js'
  import SongSlides from './SongSlides.svelte'

  let expandedId = $state<string | null>(null)

  function toggle(id: string) {
    expandedId = expandedId === id ? null : id
  }

  async function reloadLibrary() {
    await fetch('/api/library/reload', { method: 'POST' })
  }
</script>

<div class="library">
  <div class="search-row">
    <div class="search-wrap">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        class="search-input"
        type="search"
        placeholder="Search songs or lyrics…"
        bind:value={appState.searchQuery}
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
      {#if appState.searchQuery}
        <button class="clear-btn" aria-label="Clear search" onclick={() => (appState.searchQuery = '')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      {/if}
    </div>
    <button class="reload-btn" onclick={reloadLibrary} title="Reload library">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 4v6h6" />
        <path d="M3.51 15a9 9 0 1 0 .49-3.61" />
      </svg>
    </button>
  </div>

  <div class="song-list">
    {#if appState.library.length === 0}
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 19V6l12-3v13" />
          <circle cx="6" cy="19" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <p>No songs in library</p>
        <p class="hint">Add .txt files to the <code>lyrics/</code> folder</p>
      </div>
    {:else if appState.filteredLibrary.length === 0}
      <div class="empty-state">
        <p>No results for "<strong>{appState.searchQuery}</strong>"</p>
      </div>
    {:else}
      {#each appState.filteredLibrary as song (song.id)}
        {@const inSetlist = appState.presentation.setlist.includes(song.id)}
        {@const isCurrentSong = appState.presentation.currentSongId === song.id}
        <div class="song-item" class:current={isCurrentSong}>
          <div class="song-row" class:expanded={expandedId === song.id}>
            <button class="song-toggle" onclick={() => toggle(song.id)}>
              <div class="song-info">
                <span class="title">{song.title}</span>
                {#if song.artist}
                  <span class="artist">{song.artist}</span>
                {/if}
              </div>
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
            </button>
            <button
              class="add-btn"
              class:in-setlist={inSetlist}
              onclick={() => send({ type: inSetlist ? 'setlist:remove' : 'setlist:add', songId: song.id })}
              title={inSetlist ? 'Remove from setlist' : 'Add to setlist'}
            >
              {#if inSetlist}
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              {:else}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              {/if}
            </button>
          </div>

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
  .library {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .search-row {
    display: flex;
    gap: 8px;
    padding: 12px 14px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .search-wrap {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 10px;
    width: 17px;
    height: 17px;
    color: var(--text-dim);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 9px 36px 9px 34px;
    font-size: 0.9rem;
    color: var(--text);
    outline: none;
    transition: border-color 0.15s;
    -webkit-appearance: none;
    appearance: none;
  }

  .search-input:focus {
    border-color: var(--primary);
  }

  .search-input::placeholder {
    color: var(--text-dim);
  }

  .clear-btn {
    position: absolute;
    right: 8px;
    width: 20px;
    height: 20px;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-btn svg {
    width: 14px;
    height: 14px;
  }

  .reload-btn {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    color: var(--text-dim);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid var(--border);
    transition: color 0.15s;
  }

  .reload-btn:active {
    color: var(--primary);
  }

  .reload-btn svg {
    width: 17px;
    height: 17px;
  }

  .song-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    -webkit-overflow-scrolling: touch;
  }

  .song-item {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
  }

  .song-item.current {
    border-color: rgba(232, 160, 32, 0.3);
    box-shadow: inset 3px 0 0 var(--primary);
  }

  .song-row {
    display: flex;
    align-items: center;
    border-radius: var(--radius);
  }

  .song-row.expanded {
    background: var(--surface-2);
    border-radius: var(--radius) var(--radius) 0 0;
  }

  .song-toggle {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    text-align: left;
    transition: background 0.1s;
    border-radius: var(--radius);
  }

  .song-toggle:active {
    background: var(--surface-2);
  }

  .song-row.expanded .song-toggle {
    border-radius: var(--radius) 0 0 0;
  }

.song-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .artist {
    font-size: 0.75rem;
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chevron {
    width: 18px;
    height: 18px;
    color: var(--text-dim);
    flex-shrink: 0;
    transition: transform 0.2s;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .add-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface-2);
    color: var(--text-dim);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-right: 12px;
    transition: all 0.15s;
  }

  .add-btn:active {
    transform: scale(0.9);
  }

  .add-btn.in-setlist {
    background: var(--primary-dim);
    color: var(--primary);
  }

  .add-btn svg {
    width: 16px;
    height: 16px;
  }

  .expanded-panel {
    border-top: 1px solid var(--border);
    padding: 10px;
    background: var(--bg);
    border-radius: 0 0 var(--radius) var(--radius);
    max-height: 400px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
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

  code {
    background: var(--surface-2);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 0.8em;
  }
</style>
