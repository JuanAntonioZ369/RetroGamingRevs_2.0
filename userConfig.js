/**
 * userConfig.js — Configuración local del usuario (userData.json)
 * Guarda el nickname y otras preferencias localmente, sin Supabase.
 */
const fs = require('fs')
const path = require('path')

const CONFIG_PATH = path.join(__dirname, 'userData.json')

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  } catch {
    return {}
  }
}

function writeConfig(data) {
  const merged = { ...readConfig(), ...data }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf8')
}

function getLocalNick() {
  return readConfig().nickname || ''
}

function setLocalNick(nickname) {
  writeConfig({ nickname: nickname.trim() })
}

function getGamesDir() {
  return readConfig().gamesDir || ''
}

function setGamesDir(dir) {
  writeConfig({ gamesDir: dir })
}

// ── Modo invitado ─────────────────────────────────────────────
// IS_BETA = true  → invitados pueden entrar libremente
// IS_BETA = false → solo usuarios registrados (cambiar cuando se lance)
const IS_BETA = true

function isGuest() {
  return readConfig().isGuest === true
}

function setGuest(val) {
  writeConfig({ isGuest: Boolean(val) })
}

module.exports = { readConfig, writeConfig, getLocalNick, setLocalNick, getGamesDir, setGamesDir, IS_BETA, isGuest, setGuest }
