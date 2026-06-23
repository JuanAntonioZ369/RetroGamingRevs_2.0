/**
 * configManager.js
 * Devuelve los argumentos --appendconfig correctos según el modo de juego.
 * RetroArch carga primero retroarch.cfg y luego el appendconfig,
 * que sobreescribe solo las claves que se listen aquí.
 */

const path = require('path')

const CONFIG_DIR = path.join(__dirname, 'Emuladores', 'RetroArch-Win64', 'config')

function getOfflineArgs() {
  return ['--appendconfig', path.join(CONFIG_DIR, 'offline.cfg')]
}

function getOnlineArgs() {
  return ['--appendconfig', path.join(CONFIG_DIR, 'online.cfg')]
}

module.exports = { getOfflineArgs, getOnlineArgs }
