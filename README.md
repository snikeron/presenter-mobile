# PraisePresenter

A modern worship lyrics presentation system. Run it on your laptop, control it from any phone on the network — or directly from the host machine itself.

## Features

- **Desktop host app** — a responsive Electron app showing the QR code, server status, connected controllers, and full song library / setlist / display controls
- **Mobile controller** — browse your song library, build a setlist, and control what's on screen from any phone or tablet on the same network
- **Projection display** — full-screen, clean white text on black, with smooth crossfade transitions between slides
- **Zero-config networking** — connect by scanning the QR code, or navigate to `http://praise.local`
- **Presenter format** — reads standard Presenter 5 `.txt` song files (title, artist, verse/chorus/bridge sections, copyright, CCLI)
- **Real-time sync** — WebSocket-based; all controllers and the display stay in sync instantly

## Quick Start (Electron — recommended)

Download the portable `PraisePresenter.exe` from the [Releases](../../releases) page and run it. No installation required.

On first launch it will:
1. Start the built-in server and display the QR code
2. Open a full-screen projection display on a second monitor if one is connected
3. Copy the bundled sample songs into your user data folder

Scan the QR code on a phone (same WiFi) to open the mobile controller, or use the Library / Setlist / Display tabs in the host app directly.

### Changing the lyrics folder

Click **Change…** next to the folder path in the host app to point PraisePresenter at any folder on disk. The library reloads immediately without restarting.

## Quick Start (server-only / headless)

```bash
npm install
npm run build
npm start          # runs on port 80 by default
```

Open `http://localhost/display` in your projection browser. On a phone (same WiFi), scan the QR code shown in the terminal or navigate to `http://praise.local`.

> **Port 80 requires admin/elevated privileges on Windows.** Run as Administrator, or set `PORT=8080`.

## Development

```bash
npm run dev
```

Vite dev server on `:5173` (frontend hot-reload), Fastify API + WebSocket on `:3000`. Both are proxied automatically.

## Building the Electron app

```bash
npm run electron:build:win    # Windows portable .exe
npm run electron:build:mac    # macOS .dmg
npm run electron:build:linux  # Linux AppImage
```

> **Tip (Windows):** Add `release\` to Windows Defender's exclusion list before building to avoid the antivirus locking the output file mid-write:
> ```powershell
> Add-MpPreference -ExclusionPath "C:\path\to\presenter-mobile\release"
> ```

## Adding Songs

Drop Presenter 5 `.txt` files into your lyrics folder:

```
Song Title
Artist Name
.i Copyright © 2024 Example Music
.s V1 C V2 C B C

.1
First line of verse one
Second line of verse one

Third line (new slide)

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

| URL                            | Purpose                                     |
| ------------------------------ | ------------------------------------------- |
| `http://praise.local`          | Mobile controller                           |
| `http://praise.local/display`  | Projection display                          |
| `http://localhost/display`     | Projection display (local browser)          |
| `http://<LAN-IP>`              | Direct IP fallback if mDNS doesn't resolve  |
| `http://localhost/api/library` | Song library JSON                           |
| `http://localhost/api/clients` | Connected controllers JSON                  |
| `http://localhost/api/status`  | Server status JSON                          |

## Architecture

```
presenter-mobile/
├── electron/
│   ├── main.ts       # Electron main process (windows, IPC, server lifecycle)
│   └── preload.ts    # contextBridge API exposed to host panel renderer
├── server/
│   ├── app.ts        # Fastify setup (REST API, WebSocket, static serving)
│   ├── index.ts      # CLI entry point (headless / dev mode)
│   ├── lyrics.ts     # Presenter .txt parser
│   ├── library.ts    # Song library (scans lyrics folder, caches)
│   ├── websocket.ts  # Real-time state sync + connected client tracking
│   ├── mdns.ts       # praise.local mDNS advertisement
│   └── cli.ts        # Terminal output formatting
├── src/
│   ├── controller/   # Mobile controller UI (Svelte 5)
│   ├── display/      # Projection display UI (Svelte 5)
│   └── host/         # Electron host panel UI (Svelte 5, responsive)
├── shared/
│   └── types.ts      # Shared TypeScript types (Song, Slide, messages)
├── scripts/
│   ├── build-electron.mjs   # esbuild: bundles main + preload to CJS
│   └── generate-icons.mjs   # SVG → PNG / ICO / ICNS icon pipeline
└── lyrics/           # Bundled sample songs (.txt)
```

**Stack:** Electron · Fastify · Svelte 5 · Vite 6 · TypeScript · WebSockets · multicast-dns · esbuild · electron-builder

## Environment Variables (server-only / headless mode)

| Variable     | Default        | Description                       |
| ------------ | -------------- | --------------------------------- |
| `PORT`       | `80`           | HTTP port                         |
| `HOST`       | `0.0.0.0`      | Bind address                      |
| `LYRICS_DIR` | `./lyrics`     | Path to song library              |
| `NODE_ENV`   | _(production)_ | Set to `development` for dev mode |
