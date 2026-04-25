# PraisePresenter

A modern worship lyrics presentation system. Run it on your laptop, control it from your phone.

## Features

- **Mobile controller** — browse your song library, build a setlist, and control what's on screen from any phone on the same network
- **Projection display** — full-screen, clean white text on black, with smooth crossfade transitions between slides
- **Zero-config networking** — connect your phone by scanning the QR code shown at startup, or navigate to `http://praise.local`
- **Presenter format** — reads standard Presenter 5 `.txt` song files (title, artist, verse/bridge/coda sections, copyright, CCLI)
- **Real-time sync** — WebSocket-based; all controllers and the display stay in sync instantly

## Quick Start

```bash
# Install dependencies
npm install

# Build the frontend
npm run build

# Start the server (runs on port 80 by default)
npm start
```

Open `http://localhost/display` in the browser you'll use for projection. On your phone (same WiFi), scan the QR code shown in the terminal or navigate to `http://praise.local`.

> **Port 80 requires admin/elevated privileges on Windows.** Run your terminal as Administrator, or set `PORT=8080` to use a non-privileged port.

## Development

```bash
npm run dev
```

Vite dev server runs on `:5173` (frontend hot-reload), backend API + WebSocket on `:3000`. Both are proxied automatically.

## Adding Songs

Drop Presenter 5 `.txt` files into the `lyrics/` folder:

```
Song Title
Artist Name
.i Copyright © 2024 Example Music
.s V1 C V2 C B C

.1
First line of verse one
Second line of verse one

Third line (new slide if verse 1 needs to be split)

.0
Chorus line one
Chorus line two
```

**Format tags:**

| Tag            | Meaning                             |
| -------------- | ----------------------------------- |
| `.i`           | Copyright / info                    |
| `.s`           | Suggested sequence (operator guide) |
| `.#`           | Comment (ignored)                   |
| `.1`–`.9`      | Verse sections                      |
| `.0`           | Chorus                              |
| `./`           | Bridge                              |
| `.*`           | Coda                                |
| `.-`           | Multi-language splitter             |
| `.` (alone)    | Blank line within a slide           |
| _(blank line)_ | Start a new slide                   |

Tap the **↺ reload** button in the Library tab to pick up new files without restarting.

## URLs

| URL                           | Purpose                                    |
| ----------------------------- | ------------------------------------------ |
| `http://praise.local`         | Mobile controller                          |
| `http://praise.local/display` | Projection display                         |
| `http://localhost/display`    | Projection display (on the host machine)   |
| `http://<LAN-IP>`             | Direct IP fallback if mDNS doesn't resolve |

## Architecture

```
presenter-mobile/
├── server/          # Fastify backend (API + WebSocket + mDNS)
│   ├── index.ts     # Server entry point
│   ├── lyrics.ts    # Presenter .txt parser
│   ├── library.ts   # Song library (scans lyrics/)
│   ├── websocket.ts # Real-time state sync
│   ├── mdns.ts      # praise.local advertisement
│   └── cli.ts       # Startup output formatting
├── src/
│   ├── controller/  # Mobile controller (Svelte 5)
│   └── display/     # Projection display (Svelte 5)
├── shared/
│   └── types.ts     # Shared TypeScript types
└── lyrics/          # Song library (.txt files)
```

**Stack:** Fastify · Svelte 5 · Vite 6 · TypeScript · WebSockets · multicast-dns · tsx

## Environment Variables

| Variable     | Default        | Description                       |
| ------------ | -------------- | --------------------------------- |
| `PORT`       | `80`           | HTTP port                         |
| `HOST`       | `0.0.0.0`      | Bind address                      |
| `LYRICS_DIR` | `./lyrics`     | Path to song library              |
| `NODE_ENV`   | _(production)_ | Set to `development` for dev mode |
