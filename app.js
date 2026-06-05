const DB_NAME = "pulsestream-db";
const DB_VERSION = 1;
const SONG_STORE = "songs";
const PLAYLIST_STORE = "playlists";
const SETTINGS_KEY = "pulsestream-settings";
const RECENT_KEY = "pulsestream-recent";
const QUEUE_KEY = "pulsestream-queue";
const DEFAULT_MUSIC_KEY = "pulsestream-default-music-loaded";
const DEFAULT_MUSIC_MANIFEST = "default-music/manifest.json";

const state = {
  songs: [],
  playlists: [],
  discoverResults: [],
  currentSongId: null,
  currentQueue: [],
  queue: [],
  recent: [],
  selectedPlaylistId: null,
  search: "",
  sort: "recent",
  filter: "all",
  hookMode: false,
  shuffle: false,
  repeat: "off",
  fallbackStartedAt: 0,
  sleepTimerId: null,
  objectUrls: new Map(),
  settings: {
    theme: "dark",
    jamendoClientId: "",
  },
};

const els = {
  audio: document.getElementById("audioPlayer"),
  fileInput: document.getElementById("fileInput"),
  dropZone: document.getElementById("dropZone"),
  uploadStatus: document.getElementById("uploadStatus"),
  uploadProgressBar: document.getElementById("uploadProgressBar"),
  manualTitle: document.getElementById("manualTitle"),
  manualArtist: document.getElementById("manualArtist"),
  manualAlbum: document.getElementById("manualAlbum"),
  manualMood: document.getElementById("manualMood"),
  manualCover: document.getElementById("manualCover"),
  browseFilesButton: document.getElementById("browseFilesButton"),
  loadDefaultMusicButton: document.getElementById("loadDefaultMusicButton"),
  navTabs: document.querySelectorAll(".nav-tab"),
  mobileTabs: document.querySelectorAll(".mobile-tab"),
  views: {
    library: document.getElementById("libraryView"),
    liked: document.getElementById("likedView"),
    recent: document.getElementById("recentView"),
    discover: document.getElementById("discoverView"),
    playlists: document.getElementById("playlistsView"),
    queue: document.getElementById("queueView"),
    upload: document.getElementById("uploadView"),
    settings: document.getElementById("settingsView"),
  },
  trackList: document.getElementById("trackList"),
  likedList: document.getElementById("likedList"),
  recentList: document.getElementById("recentList"),
  discoverList: document.getElementById("discoverList"),
  playlistTracks: document.getElementById("playlistTracks"),
  queueList: document.getElementById("queueList"),
  libraryEmpty: document.getElementById("libraryEmpty"),
  likedEmpty: document.getElementById("likedEmpty"),
  recentEmpty: document.getElementById("recentEmpty"),
  discoverEmpty: document.getElementById("discoverEmpty"),
  playlistEmpty: document.getElementById("playlistEmpty"),
  queueEmpty: document.getElementById("queueEmpty"),
  trackTemplate: document.getElementById("trackTemplate"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  filterSelect: document.getElementById("filterSelect"),
  playlistForm: document.getElementById("playlistForm"),
  playlistName: document.getElementById("playlistName"),
  playlistGrid: document.getElementById("playlistGrid"),
  playlistDetail: document.getElementById("playlistDetail"),
  playlistTitle: document.getElementById("playlistTitle"),
  playlistCoverInput: document.getElementById("playlistCoverInput"),
  playPlaylistButton: document.getElementById("playPlaylistButton"),
  deletePlaylistButton: document.getElementById("deletePlaylistButton"),
  playLikedButton: document.getElementById("playLikedButton"),
  clearRecentButton: document.getElementById("clearRecentButton"),
  clearQueueButton: document.getElementById("clearQueueButton"),
  nowTitle: document.getElementById("nowTitle"),
  nowArtist: document.getElementById("nowArtist"),
  coverArt: document.getElementById("coverArt"),
  playButton: document.getElementById("playButton"),
  prevButton: document.getElementById("prevButton"),
  nextButton: document.getElementById("nextButton"),
  shuffleButton: document.getElementById("shuffleButton"),
  repeatButton: document.getElementById("repeatButton"),
  hookModeToggle: document.getElementById("hookModeToggle"),
  hookStartInput: document.getElementById("hookStartInput"),
  hookLengthInput: document.getElementById("hookLengthInput"),
  smartAnalyzeButton: document.getElementById("smartAnalyzeButton"),
  markHookButton: document.getElementById("markHookButton"),
  saveHookButton: document.getElementById("saveHookButton"),
  progressRange: document.getElementById("progressRange"),
  currentTime: document.getElementById("currentTime"),
  durationTime: document.getElementById("durationTime"),
  volumeRange: document.getElementById("volumeRange"),
  sleepTimerSelect: document.getElementById("sleepTimerSelect"),
  themeSelect: document.getElementById("themeSelect"),
  exportBackupButton: document.getElementById("exportBackupButton"),
  importBackupInput: document.getElementById("importBackupInput"),
  discoverForm: document.getElementById("discoverForm"),
  discoverSearchInput: document.getElementById("discoverSearchInput"),
  discoverStatus: document.getElementById("discoverStatus"),
  jamendoClientIdInput: document.getElementById("jamendoClientIdInput"),
  saveApiSettingsButton: document.getElementById("saveApiSettingsButton"),
  trackCount: document.getElementById("trackCount"),
  playlistCount: document.getElementById("playlistCount"),
  heroUploadButton: document.getElementById("heroUploadButton"),
};

let db;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SONG_STORE)) database.createObjectStore(SONG_STORE, { keyPath: "id" });
      if (!database.objectStoreNames.contains(PLAYLIST_STORE)) database.createObjectStore(PLAYLIST_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionStore(storeName, mode = "readonly") {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const request = transactionStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putItem(storeName, item) {
  return new Promise((resolve, reject) => {
    const request = transactionStore(storeName, "readwrite").put(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

function deleteItem(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = transactionStore(storeName, "readwrite").delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function hydrate() {
  state.songs = await getAll(SONG_STORE);
  state.playlists = await getAll(PLAYLIST_STORE);
  state.settings = { ...state.settings, ...readJson(SETTINGS_KEY, {}) };
  state.recent = readJson(RECENT_KEY, []);
  state.queue = readJson(QUEUE_KEY, []);
  applyTheme();
  render();
}

function setView(viewName) {
  els.navTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  els.mobileTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mobileView === viewName));
  Object.entries(els.views).forEach(([key, view]) => view.classList.toggle("active", key === viewName));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDisplayTitle(file) {
  return file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function songSubtitle(song) {
  const mood = song.mood ? ` | ${song.mood}` : "";
  return `${song.artist || "Unknown artist"} | ${song.fileType || "audio"}${mood}`;
}

function normalizedText(song) {
  return [song.title, song.artist, song.album, song.mood].join(" ").toLowerCase();
}

function allKnownSongs() {
  return [...state.songs, ...state.discoverResults];
}

function findSong(songId) {
  return allKnownSongs().find((song) => song.id === songId);
}

function filteredSongs(baseSongs = state.songs) {
  const query = state.search.trim().toLowerCase();
  let songs = query ? baseSongs.filter((song) => normalizedText(song).includes(query)) : [...baseSongs];

  if (state.filter === "liked") songs = songs.filter((song) => song.liked);
  if (["chill", "focus", "gym", "party"].includes(state.filter)) {
    songs = songs.filter((song) => song.mood === state.filter);
  }

  return songs.sort((a, b) => {
    if (state.sort === "title") return a.title.localeCompare(b.title);
    if (state.sort === "artist") return (a.artist || "").localeCompare(b.artist || "");
    if (state.sort === "duration") return (a.duration || 0) - (b.duration || 0);
    if (state.sort === "plays") return (b.playCount || 0) - (a.playCount || 0);
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function objectUrlFor(song) {
  if (song.audioUrl) return song.audioUrl;
  if (!state.objectUrls.has(song.id)) state.objectUrls.set(song.id, URL.createObjectURL(song.blob));
  return state.objectUrls.get(song.id);
}

function coverStyleFor(songOrPlaylist) {
  return songOrPlaylist?.cover
    ? `background-image: url("${songOrPlaylist.cover}")`
    : "";
}

function setIcon(button, iconId) {
  button.innerHTML = `<svg aria-hidden="true"><use href="#${iconId}"></use></svg>`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return fileToDataUrl(blob);
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/data:(.*);base64/)?.[1] || "application/octet-stream";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

function getAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration || 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });
}

function playlistOptions(selectedSongId) {
  const select = document.createElement("select");
  select.className = "playlist-picker";
  select.setAttribute("aria-label", "Add song to playlist");

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = state.playlists.length ? "Add to playlist" : "No playlists";
  select.appendChild(placeholder);

  state.playlists.forEach((playlist) => {
    const option = document.createElement("option");
    option.value = playlist.id;
    option.textContent = playlist.songIds.includes(selectedSongId) ? `Added: ${playlist.name}` : playlist.name;
    select.appendChild(option);
  });

  select.addEventListener("change", async () => {
    const playlist = state.playlists.find((item) => item.id === select.value);
    if (!playlist || playlist.songIds.includes(selectedSongId)) {
      select.value = "";
      return;
    }
    playlist.songIds.push(selectedSongId);
    await putItem(PLAYLIST_STORE, playlist);
    await hydrate();
  });

  return select;
}

function createTrackRow(song, queue, options = {}) {
  const row = els.trackTemplate.content.firstElementChild.cloneNode(true);
  row.classList.toggle("active", song.id === state.currentSongId);
  row.querySelector(".track-meta strong").textContent = song.title;
  row.querySelector(".track-meta small").textContent = songSubtitle(song);
  row.querySelector(".track-album").textContent = song.album || "Local uploads";
  row.querySelector(".track-stats").textContent = `${formatTime(song.duration)} | ${formatBytes(song.size)} | ${song.playCount || 0} plays`;

  const rowCover = row.querySelector(".row-cover");
  rowCover.setAttribute("style", coverStyleFor(song));

  row.querySelector(".track-play").addEventListener("click", () => playSong(song.id, queue));
  row.querySelector(".like-button").classList.toggle("active", Boolean(song.liked));
  row.querySelector(".like-button").setAttribute("aria-label", song.liked ? "Unlike song" : "Like song");
  row.querySelector(".like-button").setAttribute("title", song.liked ? "Unlike" : "Like");
  row.querySelector(".like-button").addEventListener("click", () => toggleLike(song.id));
  row.querySelector(".queue-button").addEventListener("click", () => addToQueue(song.id));
  row.querySelector(".edit-button").addEventListener("click", () => editSong(song.id));

  const picker = playlistOptions(song.id);
  row.querySelector(".playlist-picker").replaceWith(picker);

  const upButton = row.querySelector(".move-up-button");
  const downButton = row.querySelector(".move-down-button");
  if (options.reorderPlaylistId) {
    upButton.hidden = false;
    downButton.hidden = false;
    upButton.addEventListener("click", () => movePlaylistSong(options.reorderPlaylistId, song.id, -1));
    downButton.addEventListener("click", () => movePlaylistSong(options.reorderPlaylistId, song.id, 1));
  }

  row.querySelector(".remove-button").addEventListener("click", async () => {
    if (options.removeFromPlaylistId) {
      const playlist = state.playlists.find((item) => item.id === options.removeFromPlaylistId);
      playlist.songIds = playlist.songIds.filter((id) => id !== song.id);
      await putItem(PLAYLIST_STORE, playlist);
    } else if (options.removeFromQueue) {
      state.queue = state.queue.filter((id) => id !== song.id);
      saveJson(QUEUE_KEY, state.queue);
    } else {
      await deleteSong(song.id);
    }
    await hydrate();
  });

  return row;
}

function createDiscoverRow(song) {
  const row = createTrackRow(song, state.discoverResults, { onlinePreview: true });
  const editButton = row.querySelector(".edit-button");
  const removeButton = row.querySelector(".remove-button");
  const queueButton = row.querySelector(".queue-button");
  const addButton = editButton.cloneNode(true);

  addButton.setAttribute("title", "Add to library");
  addButton.setAttribute("aria-label", "Add online track to library");
  addButton.addEventListener("click", () => addOnlineSongToLibrary(song.id));
  setIcon(addButton, "icon-plus");
  editButton.replaceWith(addButton);

  queueButton.hidden = true;
  removeButton.hidden = true;
  return row;
}

function renderTracks() {
  const songs = filteredSongs();
  els.trackList.replaceChildren(...songs.map((song) => createTrackRow(song, songs)));
  els.libraryEmpty.classList.toggle("show", state.songs.length === 0);

  const likedSongs = state.songs.filter((song) => song.liked);
  els.likedList.replaceChildren(...likedSongs.map((song) => createTrackRow(song, likedSongs)));
  els.likedEmpty.classList.toggle("show", likedSongs.length === 0);

  const recentSongs = state.recent.map((id) => state.songs.find((song) => song.id === id)).filter(Boolean);
  els.recentList.replaceChildren(...recentSongs.map((song) => createTrackRow(song, recentSongs)));
  els.recentEmpty.classList.toggle("show", recentSongs.length === 0);

  const queuedSongs = state.queue.map((id) => state.songs.find((song) => song.id === id)).filter(Boolean);
  els.queueList.replaceChildren(...queuedSongs.map((song) => createTrackRow(song, queuedSongs, { removeFromQueue: true })));
  els.queueEmpty.classList.toggle("show", queuedSongs.length === 0);

  els.discoverList.replaceChildren(...state.discoverResults.map((song) => createDiscoverRow(song)));
  els.discoverEmpty.classList.toggle("show", state.discoverResults.length === 0);
}

function renderPlaylists() {
  els.playlistGrid.replaceChildren(
    ...state.playlists.map((playlist) => {
      const card = document.createElement("button");
      card.className = "playlist-card";
      card.type = "button";
      card.classList.toggle("active", playlist.id === state.selectedPlaylistId);
      card.setAttribute("style", coverStyleFor(playlist));
      card.innerHTML = `<strong></strong><small></small>`;
      card.querySelector("strong").textContent = playlist.name;
      card.querySelector("small").textContent = `${playlist.songIds.length} songs`;
      card.addEventListener("click", () => {
        state.selectedPlaylistId = playlist.id;
        render();
      });
      return card;
    })
  );
  els.playlistEmpty.classList.toggle("show", state.playlists.length === 0);
  renderPlaylistDetail();
}

function renderPlaylistDetail() {
  const playlist = state.playlists.find((item) => item.id === state.selectedPlaylistId);
  els.playlistDetail.hidden = !playlist;
  if (!playlist) {
    els.playlistTracks.replaceChildren();
    return;
  }

  els.playlistTitle.textContent = playlist.name;
  const songs = playlist.songIds.map((id) => state.songs.find((song) => song.id === id)).filter(Boolean);
  els.playlistTracks.replaceChildren(
    ...songs.map((song) =>
      createTrackRow(song, songs, {
        removeFromPlaylistId: playlist.id,
        reorderPlaylistId: playlist.id,
      })
    )
  );
}

function renderNowPlaying() {
  const song = findSong(state.currentSongId);
  els.nowTitle.textContent = song ? song.title : "Nothing playing";
  els.nowArtist.textContent = song ? songSubtitle(song) : "Add a song and press play";
  setIcon(els.playButton, els.audio.paused ? "icon-play" : "icon-pause");
  els.playButton.setAttribute("title", els.audio.paused ? "Play" : "Pause");
  els.playButton.setAttribute("aria-label", els.audio.paused ? "Play" : "Pause");
  els.hookStartInput.value = hookStartFor(song) ?? 0;
  els.hookLengthInput.value = hookLengthFor(song) ?? 60;
  els.coverArt.setAttribute("style", coverStyleFor(song));
  els.shuffleButton.classList.toggle("active", state.shuffle);
  els.shuffleButton.setAttribute("title", state.shuffle ? "Shuffle on" : "Shuffle off");
  els.shuffleButton.setAttribute("aria-label", state.shuffle ? "Shuffle on" : "Shuffle off");
  els.repeatButton.classList.toggle("active", state.repeat !== "off");
  els.repeatButton.setAttribute("title", state.repeat === "one" ? "Repeat one" : state.repeat === "all" ? "Repeat all" : "Repeat off");
  els.repeatButton.setAttribute("aria-label", els.repeatButton.getAttribute("title"));
}

function renderCounts() {
  els.trackCount.textContent = state.songs.length;
  els.playlistCount.textContent = state.playlists.length;
}

function render() {
  renderTracks();
  renderPlaylists();
  renderNowPlaying();
  renderCounts();
  els.themeSelect.value = state.settings.theme;
  els.jamendoClientIdInput.value = state.settings.jamendoClientId || "";
}

async function deleteSong(songId) {
  await deleteItem(SONG_STORE, songId);
  state.objectUrls.delete(songId);
  state.queue = state.queue.filter((id) => id !== songId);
  state.recent = state.recent.filter((id) => id !== songId);
  saveJson(QUEUE_KEY, state.queue);
  saveJson(RECENT_KEY, state.recent);

  const updates = state.playlists.map((playlist) => ({
    ...playlist,
    songIds: playlist.songIds.filter((id) => id !== songId),
  }));
  await Promise.all(updates.map((playlist) => putItem(PLAYLIST_STORE, playlist)));

  if (state.currentSongId === songId) {
    els.audio.pause();
    els.audio.removeAttribute("src");
    state.currentSongId = null;
  }
}

async function addFiles(files) {
  const audioExtensions = [".mp3", ".m4a", ".aac", ".wav", ".ogg", ".flac"];
  const audioFiles = [...files].filter((file) => {
    const name = file.name.toLowerCase();
    return file.type.startsWith("audio/") || audioExtensions.some((extension) => name.endsWith(extension));
  });
  if (!audioFiles.length) {
    els.uploadStatus.textContent = "No audio files were selected.";
    return;
  }

  const customTitle = els.manualTitle.value.trim();
  const customArtist = els.manualArtist.value.trim();
  const customAlbum = els.manualAlbum.value.trim();
  const customMood = els.manualMood.value;
  const customCover = await fileToDataUrl(els.manualCover.files[0]);

  let added = 0;
  let duplicates = 0;
  for (const [index, file] of audioFiles.entries()) {
    const isDuplicate = state.songs.some((song) => song.fileName === file.name && song.size === file.size);
    if (isDuplicate) {
      duplicates += 1;
      continue;
    }

    const duration = await getAudioDuration(file);
    const song = {
      id: crypto.randomUUID(),
      title: customTitle && audioFiles.length === 1 ? customTitle : getDisplayTitle(file),
      artist: customArtist || "Unknown artist",
      album: customAlbum || "Local uploads",
      mood: customMood,
      fileName: file.name,
      fileType: file.type || "audio",
      size: file.size,
      duration,
      createdAt: Date.now() + index,
      liked: false,
      playCount: 0,
      hookStart: null,
      hookLength: null,
      cover: customCover,
      blob: file,
    };
    await putItem(SONG_STORE, song);
    added += 1;
    els.uploadProgressBar.style.width = `${Math.round(((index + 1) / audioFiles.length) * 100)}%`;
  }

  els.uploadStatus.textContent = `Added ${added} song${added === 1 ? "" : "s"}. Skipped ${duplicates} duplicate${duplicates === 1 ? "" : "s"}.`;
  els.fileInput.value = "";
  els.manualCover.value = "";
  await hydrate();
  setView("library");
}

async function loadDefaultMusic(force = false) {
  if (!force && localStorage.getItem(DEFAULT_MUSIC_KEY) === "true") return;

  try {
    const response = await fetch(DEFAULT_MUSIC_MANIFEST);
    if (!response.ok) throw new Error("Default music manifest was not found.");
    const tracks = await response.json();
    let added = 0;

    for (const [index, track] of tracks.entries()) {
      const exists = state.songs.some((song) => song.source === "default" && song.fileName === track.file);
      if (exists) continue;

      const audioResponse = await fetch(`default-music/${track.file}`);
      if (!audioResponse.ok) continue;
      const blob = await audioResponse.blob();
      const duration = track.duration || (await getAudioDuration(blob));

      await putItem(SONG_STORE, {
        id: crypto.randomUUID(),
        source: "default",
        title: track.title,
        artist: track.artist || "PulseStream",
        album: track.album || "Default Music",
        mood: track.mood || "",
        fileName: track.file,
        fileType: blob.type || "audio/wav",
        size: blob.size,
        duration,
        createdAt: Date.now() + index,
        liked: false,
        playCount: 0,
        hookStart: null,
        hookLength: null,
        autoHookStart: 5,
        autoHookLength: Math.min(30, Math.max(12, Math.floor(duration - 2))),
        cover: "",
        blob,
      });
      added += 1;
    }

    localStorage.setItem(DEFAULT_MUSIC_KEY, "true");
    if (force) els.uploadStatus.textContent = added ? `Loaded ${added} default tracks.` : "Default tracks are already loaded.";
    await hydrate();
  } catch (error) {
    console.error(error);
    if (force) els.uploadStatus.textContent = "Could not load default music.";
  }
}

function mapJamendoTrack(track) {
  return {
    id: `jamendo-${track.id}`,
    source: "jamendo",
    externalId: track.id,
    title: track.name || "Untitled track",
    artist: track.artist_name || "Unknown artist",
    album: track.album_name || "Jamendo",
    mood: track.musicinfo?.tags?.genres?.[0] || "",
    fileName: track.audiodownload || track.audio,
    fileType: "online audio",
    size: 0,
    duration: Number(track.duration) || 0,
    createdAt: Date.now(),
    liked: false,
    playCount: 0,
    hookStart: null,
    hookLength: null,
    autoHookStart: null,
    autoHookLength: null,
    cover: track.album_image || track.image || "",
    audioUrl: track.audio || track.audiodownload,
    shareUrl: track.shareurl || "",
  };
}

async function searchJamendo(query) {
  const clientId = state.settings.jamendoClientId?.trim();
  if (!clientId) {
    els.discoverStatus.textContent = "Add your free Jamendo client ID in Settings before searching.";
    setView("settings");
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    format: "json",
    limit: "20",
    include: "musicinfo",
    audioformat: "mp32",
    order: "popularity_total",
    search: query || "music",
  });

  els.discoverStatus.textContent = "Searching Jamendo...";
  try {
    const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params.toString()}`);
    if (!response.ok) throw new Error("Jamendo request failed.");
    const data = await response.json();
    state.discoverResults = (data.results || []).map(mapJamendoTrack).filter((song) => song.audioUrl);
    els.discoverStatus.textContent = state.discoverResults.length
      ? `Found ${state.discoverResults.length} free tracks.`
      : "No Jamendo tracks found for that search.";
    render();
  } catch (error) {
    console.error(error);
    els.discoverStatus.textContent = "Could not fetch Jamendo tracks. Check your client ID and connection.";
  }
}

async function addOnlineSongToLibrary(songId) {
  const song = state.discoverResults.find((item) => item.id === songId);
  if (!song) return;

  const exists = state.songs.some((item) => item.source === "jamendo" && item.externalId === song.externalId);
  if (exists) {
    els.discoverStatus.textContent = "That online track is already in your library.";
    return;
  }

  await putItem(SONG_STORE, { ...song, id: crypto.randomUUID(), createdAt: Date.now() });
  els.discoverStatus.textContent = `"${song.title}" added to your library.`;
  await hydrate();
}

function queueFromSongs(songs) {
  return songs.map((song) => song.id);
}

async function playSong(songId, queue = state.songs) {
  const song = findSong(songId);
  if (!song) return;

  state.currentSongId = song.id;
  state.currentQueue = Array.isArray(queue) && queue.length ? queueFromSongs(queue) : queueFromSongs(state.songs);
  state.fallbackStartedAt = 0;

  const librarySong = state.songs.find((item) => item.id === song.id);
  if (librarySong) {
    librarySong.playCount = (librarySong.playCount || 0) + 1;
    librarySong.lastPlayedAt = Date.now();
    await putItem(SONG_STORE, librarySong);
    addRecent(librarySong.id);
  }

  els.audio.src = objectUrlFor(song);
  els.audio.addEventListener(
    "loadedmetadata",
    () => {
      const hookStart = hookStartFor(song);
      if (state.hookMode && hookStart !== null) {
        const start = Math.min(hookStart, Math.max(0, els.audio.duration - 1));
        els.audio.currentTime = start;
        state.fallbackStartedAt = start;
      } else {
        state.fallbackStartedAt = els.audio.currentTime || 0;
      }
    },
    { once: true }
  );
  els.audio.play();
  if (librarySong) await hydrate();
  else renderNowPlaying();
}

function addRecent(songId) {
  state.recent = [songId, ...state.recent.filter((id) => id !== songId)].slice(0, 30);
  saveJson(RECENT_KEY, state.recent);
}

function hasSavedHook(song) {
  return Number.isFinite(song?.hookStart) && Number.isFinite(song?.hookLength) && song.hookLength > 0;
}

function hasSmartHook(song) {
  return Number.isFinite(song?.autoHookStart) && Number.isFinite(song?.autoHookLength) && song.autoHookLength > 0;
}

function hookStartFor(song) {
  if (hasSavedHook(song)) return song.hookStart;
  if (hasSmartHook(song)) return song.autoHookStart;
  return null;
}

function hookLengthFor(song) {
  if (hasSavedHook(song)) return song.hookLength;
  if (hasSmartHook(song)) return song.autoHookLength;
  return null;
}

async function analyzeSongHook(song) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("This browser does not support audio analysis.");

  const audioContext = new AudioContextClass();
  const arrayBuffer = song.blob
    ? await song.blob.arrayBuffer()
    : await fetch(song.audioUrl, { mode: "cors" }).then((response) => {
        if (!response.ok) throw new Error("Could not fetch online audio for analysis.");
        return response.arrayBuffer();
      });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  const channel = audioBuffer.getChannelData(0);
  const duration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const targetLength = clamp(duration * 0.22, 24, 42);

  if (duration <= 65) {
    await audioContext.close();
    return { start: 0, length: Math.max(15, Math.floor(Math.min(60, duration))) };
  }

  const chunkSeconds = 4;
  const chunkSamples = Math.floor(sampleRate * chunkSeconds);
  const chunks = [];

  for (let start = 0; start < channel.length; start += chunkSamples) {
    const end = Math.min(start + chunkSamples, channel.length);
    let sum = 0;
    let zeroCrossings = 0;
    let previous = channel[start] || 0;

    for (let index = start; index < end; index += 1) {
      const value = channel[index];
      sum += value * value;
      if ((previous < 0 && value >= 0) || (previous >= 0 && value < 0)) zeroCrossings += 1;
      previous = value;
    }

    const samples = Math.max(1, end - start);
    chunks.push({
      time: start / sampleRate,
      rms: Math.sqrt(sum / samples),
      brightness: zeroCrossings / samples,
    });
  }

  const minStart = Math.min(35, duration * 0.18);
  const maxStart = Math.max(minStart, duration - targetLength - 12);
  const windowChunks = Math.max(1, Math.ceil(targetLength / chunkSeconds));
  let bestStart = minStart;
  let bestScore = -Infinity;

  for (let index = 0; index <= chunks.length - windowChunks; index += 1) {
    const startTime = chunks[index].time;
    if (startTime < minStart || startTime > maxStart) continue;

    const window = chunks.slice(index, index + windowChunks);
    const energy = window.reduce((total, chunk) => total + chunk.rms, 0) / window.length;
    const brightness = window.reduce((total, chunk) => total + chunk.brightness, 0) / window.length;
    const stabilityPenalty = window.reduce((total, chunk) => total + Math.abs(chunk.rms - energy), 0) / window.length;
    const latePenalty = startTime / duration > 0.78 ? 0.08 : 0;
    const score = energy * 0.82 + brightness * 24 - stabilityPenalty * 0.35 - latePenalty;

    if (score > bestScore) {
      bestScore = score;
      bestStart = startTime;
    }
  }

  await audioContext.close();
  return {
    start: Math.floor(bestStart),
    length: Math.floor(Math.min(targetLength, duration - bestStart - 2)),
  };
}

async function smartAnalyzeCurrentSong() {
  const song = findSong(state.currentSongId);
  if (!song) {
    window.alert("Play a song first, then press Smart Hook.");
    return;
  }

  els.smartAnalyzeButton.disabled = true;
  els.smartAnalyzeButton.textContent = "Analyzing";
  try {
    const hook = await analyzeSongHook(song);
    song.autoHookStart = hook.start;
    song.autoHookLength = hook.length;
    if (state.songs.some((item) => item.id === song.id)) await putItem(SONG_STORE, song);
    window.alert(`Smart hook saved at ${formatTime(hook.start)} for ${hook.length} seconds.`);
    await hydrate();
  } catch (error) {
    console.error(error);
    window.alert("Could not analyze this song in the browser.");
  } finally {
    els.smartAnalyzeButton.disabled = false;
    els.smartAnalyzeButton.textContent = "Smart Hook";
  }
}

async function saveCurrentHookSettings() {
  const song = findSong(state.currentSongId);
  if (!song) return;
  song.hookStart = Math.max(0, Number(els.hookStartInput.value) || 0);
  song.hookLength = Math.max(5, Number(els.hookLengthInput.value) || 60);
  if (state.songs.some((item) => item.id === song.id)) await putItem(SONG_STORE, song);
  await hydrate();
}

async function markCurrentHook() {
  const song = findSong(state.currentSongId);
  if (!song) {
    window.alert("Play a song first, then press Mark Hook when the best part starts.");
    return;
  }
  const suggestedLength = song.hookLength ?? (Number(els.hookLengthInput.value) || 30);
  const answer = window.prompt("How many seconds should this hook play before the next song?", suggestedLength);
  if (answer === null) return;
  const hookLength = Number(answer);
  if (!Number.isFinite(hookLength) || hookLength < 5) {
    window.alert("Please enter a hook length of at least 5 seconds.");
    return;
  }
  song.hookStart = Math.floor(els.audio.currentTime || 0);
  song.hookLength = Math.floor(hookLength);
  if (state.songs.some((item) => item.id === song.id)) await putItem(SONG_STORE, song);
  await hydrate();
}

async function playRelative(offset) {
  if (state.repeat === "one" && offset > 0) {
    els.audio.currentTime = state.hookMode ? state.fallbackStartedAt : 0;
    els.audio.play();
    return;
  }

  if (offset > 0 && state.queue.length) {
    const nextId = state.queue.shift();
    saveJson(QUEUE_KEY, state.queue);
    await playSong(nextId, allKnownSongs());
    return;
  }

  if (!state.currentQueue.length && state.songs.length) state.currentQueue = queueFromSongs(filteredSongs());
  let queue = [...state.currentQueue];
  if (state.shuffle && offset > 0) {
    queue = queue.filter((id) => id !== state.currentSongId);
    const randomId = queue[Math.floor(Math.random() * queue.length)] || state.currentSongId;
    await playSong(randomId, queue.map((id) => findSong(id)).filter(Boolean));
    return;
  }

  const currentIndex = queue.indexOf(state.currentSongId);
  let nextIndex = currentIndex === -1 ? 0 : currentIndex + offset;
  if (nextIndex >= queue.length) {
    if (state.repeat === "all") nextIndex = 0;
    else return;
  }
  if (nextIndex < 0) nextIndex = queue.length - 1;
  const nextId = queue[nextIndex];
  if (nextId) await playSong(nextId, queue.map((id) => findSong(id)).filter(Boolean));
}

async function toggleLike(songId) {
  const song = state.songs.find((item) => item.id === songId);
  if (!song) return;
  song.liked = !song.liked;
  await putItem(SONG_STORE, song);
  await hydrate();
}

function addToQueue(songId) {
  state.queue.push(songId);
  saveJson(QUEUE_KEY, state.queue);
  render();
}

async function editSong(songId) {
  const song = state.songs.find((item) => item.id === songId);
  if (!song) return;
  const title = window.prompt("Song title", song.title);
  if (title === null) return;
  const artist = window.prompt("Artist", song.artist || "Unknown artist");
  if (artist === null) return;
  const album = window.prompt("Album", song.album || "Local uploads");
  if (album === null) return;
  const mood = window.prompt("Mood: chill, focus, gym, party, or blank", song.mood || "");
  if (mood === null) return;
  song.title = title.trim() || song.title;
  song.artist = artist.trim() || "Unknown artist";
  song.album = album.trim() || "Local uploads";
  song.mood = ["chill", "focus", "gym", "party"].includes(mood.trim().toLowerCase()) ? mood.trim().toLowerCase() : "";
  await putItem(SONG_STORE, song);
  await hydrate();
}

async function movePlaylistSong(playlistId, songId, offset) {
  const playlist = state.playlists.find((item) => item.id === playlistId);
  if (!playlist) return;
  const currentIndex = playlist.songIds.indexOf(songId);
  const nextIndex = currentIndex + offset;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= playlist.songIds.length) return;
  const [id] = playlist.songIds.splice(currentIndex, 1);
  playlist.songIds.splice(nextIndex, 0, id);
  await putItem(PLAYLIST_STORE, playlist);
  await hydrate();
}

function applyTheme() {
  document.body.dataset.theme = state.settings.theme;
}

function setSleepTimer(minutes) {
  if (state.sleepTimerId) window.clearTimeout(state.sleepTimerId);
  state.sleepTimerId = null;
  if (!minutes) return;
  state.sleepTimerId = window.setTimeout(() => {
    els.audio.pause();
    els.sleepTimerSelect.value = "0";
  }, minutes * 60 * 1000);
}

async function exportBackup() {
  const songs = await Promise.all(
    state.songs.map(async (song) => ({
      ...song,
      blobDataUrl: song.blob ? await blobToDataUrl(song.blob) : "",
      blob: undefined,
    }))
  );
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    songs,
    playlists: state.playlists,
    recent: state.recent,
    queue: state.queue,
    settings: state.settings,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "pulsestream-backup.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function importBackup(file) {
  if (!file) return;
  const text = await file.text();
  const backup = JSON.parse(text);
  if (!Array.isArray(backup.songs) || !Array.isArray(backup.playlists)) {
    window.alert("This backup file does not look valid.");
    return;
  }
  for (const importedSong of backup.songs) {
    const { blobDataUrl, ...song } = importedSong;
    if (blobDataUrl) song.blob = dataUrlToBlob(blobDataUrl);
    await putItem(SONG_STORE, song);
  }
  for (const playlist of backup.playlists) await putItem(PLAYLIST_STORE, playlist);
  saveJson(RECENT_KEY, backup.recent || []);
  saveJson(QUEUE_KEY, backup.queue || []);
  saveJson(SETTINGS_KEY, backup.settings || {});
  await hydrate();
}

function attachEvents() {
  els.navTabs.forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));
  els.mobileTabs.forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.mobileView)));
  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewJump));
  });

  els.heroUploadButton.addEventListener("click", () => setView("upload"));
  els.browseFilesButton.addEventListener("click", () => els.fileInput.click());
  els.loadDefaultMusicButton.addEventListener("click", () => loadDefaultMusic(true));
  els.fileInput.addEventListener("change", (event) => addFiles(event.target.files));
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });
  els.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });
  els.filterSelect.addEventListener("change", (event) => {
    state.filter = event.target.value;
    render();
  });

  els.discoverForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchJamendo(els.discoverSearchInput.value.trim());
  });
  document.querySelectorAll("[data-discover-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      els.discoverSearchInput.value = button.dataset.discoverTag;
      searchJamendo(button.dataset.discoverTag);
    });
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, () => els.dropZone.classList.remove("dragging"));
  });
  els.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  });

  els.playlistForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = els.playlistName.value.trim();
    if (!name) return;
    const playlist = { id: crypto.randomUUID(), name, songIds: [], createdAt: Date.now(), cover: "" };
    await putItem(PLAYLIST_STORE, playlist);
    state.selectedPlaylistId = playlist.id;
    els.playlistName.value = "";
    await hydrate();
  });

  els.playPlaylistButton.addEventListener("click", () => {
    const playlist = state.playlists.find((item) => item.id === state.selectedPlaylistId);
    const songs = playlist?.songIds.map((id) => state.songs.find((song) => song.id === id)).filter(Boolean) || [];
    if (songs.length) playSong(songs[0].id, songs);
  });

  els.playlistCoverInput.addEventListener("change", async () => {
    const playlist = state.playlists.find((item) => item.id === state.selectedPlaylistId);
    if (!playlist) return;
    playlist.cover = await fileToDataUrl(els.playlistCoverInput.files[0]);
    await putItem(PLAYLIST_STORE, playlist);
    await hydrate();
  });

  els.deletePlaylistButton.addEventListener("click", async () => {
    if (!state.selectedPlaylistId) return;
    await deleteItem(PLAYLIST_STORE, state.selectedPlaylistId);
    state.selectedPlaylistId = null;
    await hydrate();
  });

  els.playLikedButton.addEventListener("click", () => {
    const liked = state.songs.filter((song) => song.liked);
    if (liked.length) playSong(liked[0].id, liked);
  });
  els.clearRecentButton.addEventListener("click", () => {
    state.recent = [];
    saveJson(RECENT_KEY, state.recent);
    render();
  });
  els.clearQueueButton.addEventListener("click", () => {
    state.queue = [];
    saveJson(QUEUE_KEY, state.queue);
    render();
  });

  els.playButton.addEventListener("click", () => {
    if (!state.currentSongId && state.songs.length) {
      playSong(filteredSongs()[0].id, filteredSongs());
      return;
    }
    if (els.audio.paused) els.audio.play();
    else els.audio.pause();
    renderNowPlaying();
  });
  els.prevButton.addEventListener("click", () => playRelative(-1));
  els.nextButton.addEventListener("click", () => playRelative(1));
  els.shuffleButton.addEventListener("click", () => {
    state.shuffle = !state.shuffle;
    renderNowPlaying();
  });
  els.repeatButton.addEventListener("click", () => {
    state.repeat = state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
    renderNowPlaying();
  });
  els.hookModeToggle.addEventListener("change", () => {
    state.hookMode = els.hookModeToggle.checked;
    const song = findSong(state.currentSongId);
    const hookStart = hookStartFor(song);
    if (state.hookMode && song && hookStart !== null && els.audio.duration) {
      els.audio.currentTime = Math.min(hookStart, Math.max(0, els.audio.duration - 1));
    }
  });
  els.smartAnalyzeButton.addEventListener("click", smartAnalyzeCurrentSong);
  els.markHookButton.addEventListener("click", markCurrentHook);
  els.saveHookButton.addEventListener("click", saveCurrentHookSettings);
  els.sleepTimerSelect.addEventListener("change", () => setSleepTimer(Number(els.sleepTimerSelect.value)));
  els.themeSelect.addEventListener("change", () => {
    state.settings.theme = els.themeSelect.value;
    saveJson(SETTINGS_KEY, state.settings);
    applyTheme();
  });
  els.saveApiSettingsButton.addEventListener("click", () => {
    state.settings.jamendoClientId = els.jamendoClientIdInput.value.trim();
    saveJson(SETTINGS_KEY, state.settings);
    els.discoverStatus.textContent = state.settings.jamendoClientId
      ? "Jamendo API settings saved. You can search Discover now."
      : "Jamendo client ID cleared. Local uploads still work.";
  });
  els.exportBackupButton.addEventListener("click", exportBackup);
  els.importBackupInput.addEventListener("change", (event) => importBackup(event.target.files[0]));

  document.addEventListener("keydown", (event) => {
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    if (event.code === "Space") {
      event.preventDefault();
      els.playButton.click();
    }
    if (event.code === "ArrowRight") els.nextButton.click();
    if (event.code === "ArrowLeft") els.prevButton.click();
  });

  els.audio.addEventListener("play", renderNowPlaying);
  els.audio.addEventListener("pause", renderNowPlaying);
  els.audio.addEventListener("ended", () => playRelative(1));
  els.audio.addEventListener("timeupdate", () => {
    const progress = els.audio.duration ? (els.audio.currentTime / els.audio.duration) * 100 : 0;
    els.progressRange.value = progress;
    els.currentTime.textContent = formatTime(els.audio.currentTime);
    els.durationTime.textContent = formatTime(els.audio.duration);

    const song = findSong(state.currentSongId);
    if (!state.hookMode || !song) return;
    const hookStart = hookStartFor(song) ?? state.fallbackStartedAt;
    const hookLength = hookLengthFor(song) ?? 60;
    if (els.audio.currentTime >= hookStart + hookLength) playRelative(1);
  });
  els.progressRange.addEventListener("input", () => {
    if (!els.audio.duration) return;
    els.audio.currentTime = (Number(els.progressRange.value) / 100) * els.audio.duration;
  });
  els.volumeRange.addEventListener("input", () => {
    els.audio.volume = Number(els.volumeRange.value);
  });
}

async function init() {
  db = await openDatabase();
  els.audio.volume = Number(els.volumeRange.value);
  attachEvents();
  await hydrate();
}

init().catch((error) => {
  console.error(error);
  els.uploadStatus.textContent = "Could not start local music storage in this browser.";
});
