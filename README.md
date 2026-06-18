# CrazzyM — Local Music Streaming Player

A fully client-side music streaming web app that runs entirely in your browser. Upload your audio files, organize them into playlists, and play them back — no server, no cloud, no internet required.

---

## Features

### Music Library
- Upload MP3, WAV, OGG, M4A, and other browser-supported audio formats
- Automatic duration detection on import
- Edit song metadata: title, artist, album, mood tag, and cover art
- Like / favourite tracks
- Track play count

### Playback
- Play, pause, skip, and seek
- Shuffle and repeat modes (off / repeat-all / repeat-one)
- Volume control
- Keyboard shortcuts: `Space` (play/pause), `←` / `→` (previous/next)

### Hook Mode
Mark the best segment of a song (start point + length). In Hook Mode the player skips straight to that segment and auto-advances after it — ideal for quickly auditioning samples, loops, and song hooks.

### Organization
- Create and manage multiple playlists with drag-to-reorder tracks
- Mood tags: Chill, Focus, Gym, Party
- Recently played history
- Search across title, artist, album, and mood

### Themes
Four built-in color themes: **Dark** (default), **Neon**, **Clean**, **Sunset** — toggled from Settings.

### Sleep Timer
Auto-stop playback after 10, 20, 30, or 60 minutes.

### Backup & Restore
Export your entire library (metadata + file references) to JSON and restore it later.

---

## Getting Started

No build step or dependencies required — just open the file.

```bash
# Option 1: open directly
open index.html

# Option 2: serve locally (avoids some browser file-access restrictions)
python3 -m http.server 8000
# then visit http://localhost:8000

# Option 3: Node.js
npx http-server
# then visit http://localhost:8080
```

### Browser Requirements

Any modern browser (Chrome, Firefox, Edge, Safari) with support for:
- IndexedDB
- HTML5 Audio API
- File API
- ES6+ JavaScript
- CSS custom properties

---

## Project Structure

```
CrazzyM/
├── index.html   # App shell — markup, SVG icon sprites, audio element
├── app.js       # All application logic (~900 lines)
└── styles.css   # Styles and themes (~1025 lines)
```

The app uses **no external libraries or frameworks**. All data is stored locally:

| Storage         | What it holds                            |
|-----------------|------------------------------------------|
| IndexedDB       | Audio file blobs, playlist definitions   |
| LocalStorage    | Settings, recently played, playback queue |

---

## How It Works

1. **Upload** audio files via drag-and-drop or the file picker.
2. Files are stored in IndexedDB — they never leave your device.
3. Use the **Library** view to browse, search, and edit tracks.
4. Build **Playlists** and tag songs with **moods** for quick filtering.
5. Enable **Hook Mode** in Settings to mark and loop the best part of each song.
6. Use **Backup** (Settings → Export) to save your library as JSON before clearing browser data.

---

## Privacy

All audio files and metadata are stored exclusively in your browser's local storage (IndexedDB / LocalStorage). Nothing is uploaded to any server.

---

## License

This project is open source. See the repository for details.
