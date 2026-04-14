const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

function jugar(carpeta, archivo) {
  const base = __dirname
  const core = path.join(base, 'RetroArch-Win64', 'cores', 'mednafen_psx_libretro.dll')
  const game = path.join(base, 'games', carpeta, archivo)
  const config = path.join(base, 'RetroArch-Win64', 'retroarch.cfg')
  const retroarch = path.join(base, 'RetroArch-Win64', 'retroarch.exe')

  console.log('game:', game)
  console.log('existe:', fs.existsSync(game))

  const proc = spawn(retroarch, [
    '-L', core,
    '--config', config,
    '--fullscreen',
    game
  ], {
    detached: true,
    stdio: 'ignore',
    cwd: path.join(base, 'RetroArch-Win64')
  })

  proc.on('error', (err) => console.error('Error spawn:', err))
  proc.unref()
}

// Multiplayer: Create room and start game
function jugarMultijugador(roomCode, carpeta, archivo) {
  const romPath = carpeta + '/' + archivo;
  return startNetplay({ mode: 'host', ip: null, port: 55435, romPath, mitmServer: '38.250.116.33' });
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
  const core = path.join(base, 'RetroArch-Win64', 'cores', 'mednafen_psx_libretro.dll')
  const config = path.join(base, 'RetroArch-Win64', 'retroarch.cfg')
  const retroarch = path.join(base, 'RetroArch-Win64', 'retroarch.exe')
  const retroarchDir = path.join(base, 'RetroArch-Win64')

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
  const retroarchPath = path.join(base, 'RetroArch-Win64', 'retroarch.exe');
  const corePath = path.join(base, 'RetroArch-Win64', 'cores', 'mednafen_psx_libretro.dll');
  const configPath = path.join(base, 'RetroArch-Win64', 'retroarch.cfg');
  const fullRomPath = path.join(base, 'games', romPath);

  let args = ['-L', corePath, '--config', configPath, '--fullscreen', fullRomPath];

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

module.exports = { jugar, jugarMultijugador, conectarSala, startNetplay }
