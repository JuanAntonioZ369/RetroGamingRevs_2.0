const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const { getOfflineArgs, getOnlineArgs } = require('./configManager')
const { getNickName, setNetplayServer } = require('./status')
const { getGamesDir } = require('./userConfig')
const { uploadSaves, downloadSaves } = require('./saveSync')

// Solo disponible en el renderer process (donde existe la sesión de Supabase)
const inRenderer = typeof window !== 'undefined'
const { updatePresence, setOffline } = inRenderer ? require('./friendsManager') : { updatePresence: () => Promise.resolve(), setOffline: () => Promise.resolve() }

// Valores por defecto (se sobreescriben con los de Supabase si están disponibles)
const DEFAULT_MEDNAFEN_HOST = 'netplay.fobby.net'
const DEFAULT_MEDNAFEN_PORT = '4046'
const DEFAULT_MITM_HOST = '38.250.116.33'
const DEFAULT_MITM_PORT = '55435'

async function getMednafenServer() {
  try { return await require('./appConfig').getMednafenNetplayServer() }
  catch(_) { return { host: DEFAULT_MEDNAFEN_HOST, port: DEFAULT_MEDNAFEN_PORT } }
}
async function getMitmServer() {
  try { return await require('./appConfig').getRetroArchMitmServer() }
  catch(_) { return { host: DEFAULT_MITM_HOST, port: DEFAULT_MITM_PORT } }
}

// Referencia al proceso de juego activo (para poder cerrarlo)
let currentGameProcess = null
function killCurrentGame() {
  if (currentGameProcess) {
    try { currentGameProcess.kill() } catch (_) {}
    currentGameProcess = null
    return true
  }
  return false
}
function isGameRunning() {
  return currentGameProcess !== null
}

// Previene path traversal: resuelve la ruta y verifica que esté dentro del directorio de juegos
function resolveGamePath(base, ...parts) {
  const savedDir = getGamesDir()
  const gamesDir = (savedDir && fs.existsSync(savedDir)) ? savedDir : path.resolve(base, 'games')
  const resolved = path.resolve(gamesDir, ...parts)
  if (!resolved.startsWith(gamesDir + path.sep) && resolved !== gamesDir) {
    throw new Error(`Path traversal detectado: "${parts.join('/')}"`)
  }
  return resolved
}

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
  // Solo usa RetroArch para sistemas explícitamente mapeados (NES, SNES, GBA…)
  // Todo lo demás (PS1, nombre de juego suelto, etc.) usa mednafen
  const sistema = carpeta.split(/[/\\]/)[0].toUpperCase()
  if (CORE_MAP[sistema]) {
    return jugarRetroArch(carpeta, archivo, sistema)
  } else {
    return jugarMednafen(carpeta, archivo)
  }
}

function jugarMednafen(carpeta, archivo) {
  if (currentGameProcess) {
    console.warn('Ya hay un juego en ejecución.')
    return { success: false, error: 'already_running' }
  }
  const base = __dirname
  const mednafenExe = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'mednafen.exe')
  const mednafenDir = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64')
  const game = resolveGamePath(base, carpeta, archivo)
  const firmwarePath = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'firmware')

  downloadSaves(archivo.replace('.cue', ''), 'mednafen').catch(() => {})

  const proc = spawn(mednafenExe, [
    '-filesys.path_firmware', firmwarePath,
    '-video.fs', '1',
    game
  ], {
    detached: true,
    stdio: 'ignore',
    cwd: mednafenDir
  })

  currentGameProcess = proc
  updatePresence(archivo.replace('.cue', '')).catch(() => {})
  proc.on('close', () => {
    if (currentGameProcess === proc) currentGameProcess = null
    setOffline().catch(() => {})
    uploadSaves(archivo.replace('.cue', ''), 'mednafen').catch(() => {})
  })
  proc.on('error', (err) => console.error('Error spawn mednafen solo:', err.message))
  proc.unref()
}

function jugarRetroArch(carpeta, archivo, sistema) {
  if (currentGameProcess) {
    console.warn('Ya hay un juego en ejecución.')
    return { success: false, error: 'already_running' }
  }
  const base = __dirname
  const coreName = CORE_MAP[sistema] || CORE_MAP[carpeta.split(/[/\\]/)[0]] || 'mednafen_psx_libretro.dll'
  const core = path.join(base, 'Emuladores', 'RetroArch-Win64', 'cores', coreName)
  const game = resolveGamePath(base, carpeta, archivo)
  const config = path.join(base, 'Emuladores', 'RetroArch-Win64', 'retroarch.cfg')
  const retroarch = path.join(base, 'Emuladores', 'RetroArch-Win64', 'retroarch.exe')

  downloadSaves(archivo.replace('.cue', ''), 'retroarch').catch(() => {})

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

  currentGameProcess = proc
  updatePresence(archivo).catch(() => {})
  proc.on('close', () => {
    if (currentGameProcess === proc) currentGameProcess = null
    setOffline().catch(() => {})
    uploadSaves(archivo.replace('.cue', ''), 'retroarch').catch(() => {})
  })
  proc.on('error', (err) => console.error('Error spawn RetroArch:', err.message))
  proc.unref()
}

// Multiplayer: Launch with mednafen netplay as HOST
async function jugarMultijugador(roomCode, carpeta, archivo) {
  if (currentGameProcess) {
    console.warn('Ya hay un juego en ejecución.')
    return { success: false, error: 'already_running' }
  }
  const base = __dirname
  const mednafenExe = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'mednafen.exe')
  const mednafenDir = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64')
  const game = resolveGamePath(base, carpeta, archivo)
  const nick = getNickName() || 'Jugador'

  // Generate random 6-char gamekey — both players must use the same key
  const gamekey = Math.random().toString(36).substring(2, 8).toUpperCase()

  const firmwarePath = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'firmware')
  const { host: netHost, port: netPort } = await getMednafenServer()

  const args = [
    '-filesys.path_firmware', firmwarePath,
    '-video.fs', '1',
    '-connect',
    '-netplay.host', netHost,
    '-netplay.port', netPort,
    '-netplay.nick', nick,
    '-netplay.gamekey', gamekey,
    game
  ]

  const proc = spawn(mednafenExe, args, {
    detached: true,
    stdio: 'ignore',
    cwd: mednafenDir
  })

  currentGameProcess = proc
  proc.on('error', (err) => console.error('Error spawn mednafen:', err.message))
  proc.on('close', async () => {
    currentGameProcess = null
    try { await uploadSaves(archivo.replace('.cue',''), 'mednafen') } catch(_) {}
    try { await setOffline() } catch(_) {}
  })
  proc.unref()

  return { success: true, gamekey }
}

// Multiplayer: Join an existing room by gamekey
async function conectarSalaMednafen(gamekey, carpeta, archivo) {
  if (currentGameProcess) {
    console.warn('Ya hay un juego en ejecución.')
    return { success: false, error: 'already_running' }
  }
  if (!/^[A-Z0-9]{1,8}$/i.test(gamekey)) {
    console.error('Gamekey inválido:', gamekey)
    return { success: false, error: 'Gamekey inválido' }
  }
  const base = __dirname
  const mednafenExe = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'mednafen.exe')
  const mednafenDir = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64')
  const game = resolveGamePath(base, carpeta, archivo)
  const nick = getNickName() || 'Jugador'
  const firmwarePath = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'firmware')
  const { host: netHost, port: netPort } = await getMednafenServer()

  const args = [
    '-filesys.path_firmware', firmwarePath,
    '-video.fs', '1',
    '-connect',
    '-netplay.host', netHost,
    '-netplay.port', netPort,
    '-netplay.nick', nick,
    '-netplay.gamekey', gamekey,
    game
  ]

  const proc = spawn(mednafenExe, args, {
    detached: true,
    stdio: 'ignore',
    cwd: mednafenDir
  })

  currentGameProcess = proc
  proc.on('error', (err) => console.error('Error spawn mednafen join:', err.message))
  proc.on('close', async () => {
    currentGameProcess = null
    try { await uploadSaves(archivo.replace('.cue',''), 'mednafen') } catch(_) {}
    try { await setOffline() } catch(_) {}
  })
  proc.unref()
  return { success: true }
}

async function obtenerSalas() {
  const res = await fetch('https://lobby.libretro.com/list/')
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
  const game = resolveGamePath(base, carpeta, archivo)
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

  const proc = spawn(retroarch, args, { detached: true, stdio: 'ignore', cwd: retroarchDir })
  currentGameProcess = proc
  updatePresence(archivo).catch(() => {})
  proc.on('error', (err) => console.error('Error spawn RetroArch:', err.message))
  proc.on('close', () => {
    if (currentGameProcess === proc) currentGameProcess = null
    setOffline().catch(() => {})
    uploadSaves(archivo.replace('.cue', ''), 'retroarch').catch(() => {})
  })
  proc.unref()
}

// Aplica el servidor MITM correcto al retroarch.cfg antes de lanzar
async function applyMitmServer() {
  try {
    const { host, port } = await getMitmServer()
    const result = setNetplayServer(host, port)
    if (!result.ok) console.warn('applyMitmServer: no se pudo escribir retroarch.cfg —', result.error)
    else console.log('applyMitmServer: servidor →', result.server)
  } catch(e) {
    // Sin conexión: deja el cfg con el último valor guardado
    console.warn('applyMitmServer: sin conexión, usando cfg previo')
  }
}

// Función para iniciar netplay (llamada desde main.js via IPC)
async function startNetplay({ mode, ip, port, romPath }) {
  await applyMitmServer()

  const base = __dirname
  const retroarchPath = path.join(base, 'Emuladores','RetroArch-Win64', 'retroarch.exe')
  const corePath = path.join(base, 'Emuladores','RetroArch-Win64', 'cores', 'mednafen_psx_libretro.dll')
  const configPath = path.join(base, 'Emuladores','RetroArch-Win64', 'retroarch.cfg')
  const fullRomPath = resolveGamePath(base, romPath)

  const args = ['-L', corePath, '--config', configPath, ...getOnlineArgs(), '--fullscreen', fullRomPath]

  if (mode === 'host') {
    args.push('--host')
  } else if (mode === 'client') {
    args.push('--connect', ip, '--port', port)
  }

  const retroarch = spawn(retroarchPath, args, { detached: true, stdio: 'ignore' })
  currentGameProcess = retroarch
  retroarch.on('close', () => {
    if (currentGameProcess === retroarch) currentGameProcess = null
    setOffline().catch(() => {})
  })
  retroarch.on('error', (err) => console.error('Error spawn:', err.message))
  retroarch.unref()

  return { success: true }
}

// Multiplayer 4 jugadores: RetroArch como host con multitap
async function jugarMultijugador4(carpeta, archivo) {
  if (currentGameProcess) {
    return { success: false, error: 'already_running' }
  }

  await applyMitmServer()

  const base = __dirname
  const core = path.join(base, 'Emuladores', 'RetroArch-Win64', 'cores', 'mednafen_psx_libretro.dll')
  const config = path.join(base, 'Emuladores', 'RetroArch-Win64', 'retroarch.cfg')
  const retroarch = path.join(base, 'Emuladores', 'RetroArch-Win64', 'retroarch.exe')
  const game = resolveGamePath(base, carpeta, archivo)

  const gamekey = Math.random().toString(36).substring(2, 8).toUpperCase()

  const args = [
    '-L', core,
    '--config', config,
    ...getOnlineArgs(),
    '--host',
    '--fullscreen',
    game
  ]

  const proc = spawn(retroarch, args, {
    detached: true,
    stdio: 'ignore',
    cwd: path.join(base, 'Emuladores', 'RetroArch-Win64')
  })

  currentGameProcess = proc
  updatePresence(archivo.replace('.cue', '') + ' (4p)').catch(() => {})
  proc.on('close', () => {
    if (currentGameProcess === proc) currentGameProcess = null
    setOffline().catch(() => {})
  })
  proc.on('error', (err) => console.error('Error spawn RetroArch 4p:', err.message))
  proc.unref()

  return { success: true, gamekey }
}

// Unirse a una sala con ruta absoluta (para juegos fuera de la carpeta games/)
async function conectarSalaMednafenAbsoluto(gamekey, absoluteGamePath) {
  if (currentGameProcess) {
    return { success: false, error: 'already_running' }
  }
  if (!/^[A-Z0-9]{1,8}$/i.test(gamekey)) {
    return { success: false, error: 'Gamekey inválido' }
  }
  if (!fs.existsSync(absoluteGamePath)) {
    return { success: false, error: 'Archivo de juego no encontrado' }
  }
  const base = __dirname
  const mednafenExe = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'mednafen.exe')
  const mednafenDir = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64')
  const nick = getNickName() || 'Jugador'
  const firmwarePath = path.join(base, 'Emuladores', 'mednafen-1.32.1-win64', 'firmware')
  const { host: netHost, port: netPort } = await getMednafenServer()

  const args = [
    '-filesys.path_firmware', firmwarePath,
    '-video.fs', '1',
    '-connect',
    '-netplay.host', netHost,
    '-netplay.port', netPort,
    '-netplay.nick', nick,
    '-netplay.gamekey', gamekey,
    absoluteGamePath
  ]

  const proc = spawn(mednafenExe, args, {
    detached: true,
    stdio: 'ignore',
    cwd: mednafenDir
  })

  currentGameProcess = proc
  const gameTitle = path.basename(absoluteGamePath).replace('.cue', '')
  updatePresence(gameTitle).catch(() => {})
  proc.on('error', (err) => console.error('Error spawn mednafen absoluto:', err.message))
  proc.on('close', async () => {
    if (currentGameProcess === proc) currentGameProcess = null
    try { await uploadSaves(gameTitle, 'mednafen') } catch(_) {}
    try { await setOffline() } catch(_) {}
  })
  proc.unref()
  return { success: true }
}

module.exports = { jugar, jugarMultijugador, jugarMultijugador4, conectarSala, conectarSalaMednafen, conectarSalaMednafenAbsoluto, startNetplay, killCurrentGame, isGameRunning }
