# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GamingRevs** is an Electron-based PS1 game launcher that wraps RetroArch to provide a modern UI for solo and online multiplayer (netplay) gaming. The bundled RetroArch build lives in `RetroArch-Win64/` and uses the `mednafen_psx_libretro.dll` core exclusively.

## Commands

```bash
# Install dependencies (first time only)
npm install

# Start the app
npm start

# Start via bat (recommended: also syncs retroarch.cfg from cfgigual.txt baseline)
run.bat
```

There are no tests or linting configured.

## Architecture

### Main Process (`main.js`)
Electron entry point. Scans `games/` for subdirectories containing a `.cue` file to build the game list, then sends it to the renderer via IPC (`games-list`). Delegates netplay launch to `gameOnly.js#startNetplay`.

### Renderer Pages (`Guia/`)
Three HTML pages form a navigation flow. `nodeIntegration: true` and `contextIsolation: false` are set, so all renderer pages can use `require()` directly to call Node modules.

1. **mainLobby.html** — Game library with list/grid toggle and search. Clicking a game navigates to GameModeSelection with `?game=folder/file.cue&title=...` query params.
2. **GameModeSelection.html** — Solo vs. Online choice screen. Solo calls `gameOnly.jugar()`, Online navigates to MultiplayerLobby.
3. **MultiplayerLobby.html** — Host or join a netplay room. Host calls `gameOnly.jugarMultijugador()` then polls `status.getID()` every 2s until the real room ID appears on `lobby.libretro.com`. Join calls `gameOnly.conectarSala()` to look up the room and connect.

### `status.js`
Communicates with a running RetroArch instance via UDP on port **55355** (RetroArch Network Commands). Also reads and writes `RetroArch-Win64/retroarch.cfg` directly for `netplay_nickname` and `netplay_password`. Key exports: `getStatus()`, `getNickName/setNickName`, `getPassword/setPassword`, `getID()` (resolves room ID from `lobby.libretro.com`).

### `gameOnly.js`
Spawns RetroArch as a detached child process. `jugar()` for solo, `startNetplay()` for host/client netplay (called by `jugarMultijugador` and `conectarSala`). Client connections use `--connect`, `--port`, `--mitm-session` flags obtained from the libretro lobby API.

## Key Configuration

- **retroarch.cfg** — Main RetroArch config. `cfgigual.txt` is a committed baseline; `run.bat` overwrites `retroarch.cfg` with it on startup if they differ. **Always edit `cfgigual.txt` first**, then `retroarch.cfg` — otherwise `run.bat` will revert changes.
- **PSX BIOS** — Must be placed in `RetroArch-Win64/system/`. Expected filenames: `scph5500.bin`, `scph5501.bin`, `scph5502.bin`, `scph1001.bin`, `scph7001.bin`.
- **Games** — Each game must be its own folder under `games/` containing a `.cue` file. Only `.cue`-based games are detected.

## Netplay Infrastructure

The app uses a **custom MITM relay server** in Lima, Peru (`38.250.116.33:55435`) configured via:
```
netplay_mitm_server = "custom"
netplay_custom_mitm_server = "38.250.116.33"
netplay_use_mitm_server = "true"
```

The server runs `netplay-mitm-server` (C++/Qt binary at `/root/netplay-mitm-server/mitm`) as a systemd service (`netplay-mitm-server.service`). To manage it:
```bash
ssh root@38.250.116.33
systemctl status netplay-mitm-server   # ver estado
systemctl restart netplay-mitm-server  # reiniciar
journalctl -u netplay-mitm-server -f   # ver logs en vivo
```

**Key netplay settings tuned for the Lima server** (in both `cfgigual.txt` and `retroarch.cfg`):
- `netplay_check_frames = 8` — sync cada ~133ms (antes era 59, casi 1 segundo de lag)
- `netplay_input_latency_frames_min = 2` — latencia intencional mínima de input
- `video_frame_delay_auto = true` — RetroArch ajusta el delay automáticamente

## External APIs

- `http://lobby.libretro.com/list/` — Used to list and resolve netplay rooms by room ID and username/game/CRC matching.
