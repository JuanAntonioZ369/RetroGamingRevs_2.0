const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const { getOfflineArgs, getOnlineArgs } = require('./configManager')
const { getNickName } = require('./status')

// Mapa de cores de RetroArch por nombre de carpeta del sistema
const CORE_MAP = {
  'NES':  'nestopia_libretro.dll',
  'SNES': 'snes9x_libretro.dll',
  'GBA':  'mgba_libretro.dll',
  'GB':   'gambatte_libretro.dll',
  'GBC':  'gambatte_libretro.dll',
  'N64':  'mupen64plus_next_libretro.dll',
  'GENESIS': 'genesis_plus_gx_libretro.dll',
  'MD':   'genesis_plus_gx_libretro.dll',
}

function jugar(carpeta, archivo) {
  const base = __dirname
  // Detectar sistema por la primera carpeta del path (ej: "PS1" de "PS1/Crash/crash.cue")
  const sistema = carpeta.split(/[/\\]/)[0].toUpperCase()

  if (sistema === 'PS1') {
    jugarMednafen(carpeta, archivo)
  } else {
    jugarRetroArch(carpeta, archivo, sistema)
  }
}

function jugarMednafen(carpeta, archivo) {
  const base = __dirname
  const mednafenExe = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'mednafen.exe')
  const mednafenDir = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64')
  const game = path.join(base, 'games', carpeta, archivo)
  const firmwarePath = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'firmware')

  const proc = spawn(mednafenExe, [
    '-filesys.path_firmware', firmwarePath,
    '-video.fs', '1',
    game
  ], {
    detached: true,
    stdio: 'ignore',
    cwd: mednafenDir
  })

  proc.on('error', (err) => console.error('Error spawn mednafen solo:', err.message))
  proc.unref()
}

function jugarRetroArch(carpeta, archivo, sistema) {
  const base = __dirname
  const coreName = CORE_MAP[sistema] || CORE_MAP[carpeta.split(/[/\\]/)[0]] || 'mednafen_psx_libretro.dll'
  const core = path.join(base, 'Emuladores', 'RetroArch-Win64', 'cores', coreName)
  const game = path.join(base, 'games', carpeta, archivo)
  const config = path.join(base, 'Emuladores', 'RetroArch-Win64', 'retroarch.cfg')
  const retroarch = path.join(base, 'Emuladores', 'RetroArch-Win64', 'retroarch.exe')

  const proc = spawn(retroarch, [
    '-L', core,
    '--config', config,
    ...getOfflineArgs(),
    '--fullscreen',
    game
  ], {
    detached: true,
    stdio: 'ignore',
    cwd: path.join(base, 'Emuladores', 'RetroArch-Win64')
  })

  proc.on('error', (err) => console.error('Error spawn RetroArch:', err.message))
  proc.unref()
}

// Multiplayer: Launch with mednafen netplay as HOST (public server netplay.fobby.net:4046)
function jugarMultijugador(roomCode, carpeta, archivo) {
  const base = __dirname
  const mednafenExe = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'mednafen.exe')
  const mednafenDir = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64')
  const game = path.join(base, 'games', carpeta, archivo)
  const nick = getNickName() || 'Jugador'

  // Generate random 6-char gamekey — both players must use the same key
  const gamekey = Math.random().toString(36).substring(2, 8).toUpperCase()

  const firmwarePath = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'firmware')

  const args = [
    '-filesys.path_firmware', firmwarePath,
    '-video.fs', '1',
    '-connect',
    '-netplay.host', 'netplay.fobby.net',
    '-netplay.port', '4046',
    '-netplay.nick', nick,
    '-netplay.gamekey', gamekey,
    game
  ]

  const proc = spawn(mednafenExe, args, {
    detached: true,
    stdio: 'ignore',
    cwd: mednafenDir
  })

  proc.on('error', (err) => console.error('Error spawn mednafen:', err.message))
  proc.unref()

  return { success: true, gamekey }
}

// Multiplayer: Join an existing room by gamekey
function conectarSalaMednafen(gamekey, carpeta, archivo) {
  const base = __dirname
  const mednafenExe = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'mednafen.exe')
  const mednafenDir = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64')
  const game = path.join(base, 'games', carpeta, archivo)
  const nick = getNickName() || 'Jugador'
  const firmwarePath = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'firmware')

  const args = [
    '-filesys.path_firmware', firmwarePath,
    '-video.fs', '1',
    '-connect',
    '-netplay.host', 'netplay.fobby.net',
    '-netplay.port', '4046',
    '-netplay.nick', nick,
    '-netplay.gamekey', gamekey,
    game
  ]

  const proc = spawn(mednafenExe, args, {
    detached: true,
    stdio: 'ignore',
    cwd: mednafenDir
  })

  proc.on('error', (err) => console.error('Error spawn mednafen join:', err.message))
  proc.unref()
  return { success: true }
}

async function obtenerSalas() {
  const res = await fetch('http://lobby.libretro.com/list/')
  const data = await res.json()
  return data
}

// Multiplayer: Join room
async function conectarSala(codigo, carpeta, archivo) {
  let salas
  try {
    salas = await obtenerSalas()
  } catch (err) {
    console.error('Error al obtener salas del lobby:', err.message)
    return
  }

  const base = __dirname
  const game = path.join(base, 'games', carpeta, archivo)
  const core = path.join(base, 'Emuladores','RetroArch-Win64', 'cores', 'mednafen_psx_libretro.dll')
  const config = path.join(base, 'Emuladores','RetroArch-Win64', 'retroarch.cfg')
  const retroarch = path.join(base, 'Emuladores','RetroArch-Win64', 'retroarch.exe')
  const retroarchDir = path.join(base, 'Emuladores','RetroArch-Win64')

  const sala = salas.find(s => s.fields.id === parseInt(codigo))

  if (!sala) {
    console.warn('Sala no encontrada:', codigo)
    return
  }

  const { mitm_ip, mitm_port, mitm_session } = sala.fields

  if (!mitm_session) {
    console.error('mitm_session vacío — sala no tiene MITM asignado')
    return
  }

  const args = [
    '-L', core,
    '--config', config,
    ...getOnlineArgs(),
    '--connect', mitm_ip,
    '--port', String(mitm_port),
    '--mitm-session', mitm_session,
    '--fullscreen',
    game
  ]

  const proc = spawn(retroarch, args, { detached: false, stdio: 'inherit', cwd: retroarchDir })
  proc.on('error', (err) => console.error('Error spawn RetroArch:', err.message))
  proc.on('close', (code) => console.log('RetroArch cerró con código:', code))
  proc.unref()
}

// Función para iniciar netplay
function startNetplay({ mode, ip, port, romPath, mitmServer }) {
  const base = __dirname
  const retroarchPath = path.join(base, 'Emuladores','RetroArch-Win64', 'retroarch.exe');
  const corePath = path.join(base, 'Emuladores','RetroArch-Win64', 'cores', 'mednafen_psx_libretro.dll');
  const configPath = path.join(base, 'Emuladores','RetroArch-Win64', 'retroarch.cfg');
  const fullRomPath = path.join(base, 'games', romPath);

  let args = ['-L', corePath, '--config', configPath, ...getOnlineArgs(), '--fullscreen', fullRomPath];

  if (mode === 'host') {
    args.push('--host');
  } else if (mode === 'client') {
    args.push('--connect', ip, '--port', port);
  }

  const retroarch = spawn(retroarchPath, args, { stdio: 'inherit' });
  retroarch.on('close', (code) => console.log('RetroArch cerró con código:', code));
  retroarch.on('error', (err) => console.error('Error spawn:', err.message));

  return { success: true };
}

module.exports = { jugar, jugarMultijugador, conectarSala, conectarSalaMednafen, startNetplay }
