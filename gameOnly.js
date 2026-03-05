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
  proc.on('close', (code) => console.log('RetroArch cerró con código:', code))
  proc.unref()
}

// Multiplayer: Create room and start game
function jugarMultijugador(roomCode, carpeta, archivo) {
  const base = __dirname
  const core = path.join(base, 'RetroArch-Win64', 'cores', 'mednafen_psx_libretro.dll')
  const game = path.join(base, 'games', carpeta, archivo)
  const config = path.join(base, 'RetroArch-Win64', 'retroarch.cfg')
  const retroarch = path.join(base, 'RetroArch-Win64', 'retroarch.exe')

  console.log('Iniciando juego multijugador con código:', roomCode)
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
  proc.on('close', (code) => console.log('RetroArch cerró con código:', code))
  proc.unref()
}

// Multiplayer: Join room
function conectarSala(roomCode) {
  console.log('Conectando a sala:', roomCode)
  // TODO: Implementar lógica de conexión a sala
}

module.exports = { jugar, jugarMultijugador, conectarSala }
