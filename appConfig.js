/**
 * appConfig.js — Configuración remota desde Supabase (beta_open, version, etc.)
 * Lee la tabla `app_config` una vez al inicio y cachea el resultado.
 */
let _cache = null

async function fetchAppConfig() {
  if (_cache) return _cache
  try {
    const { supabase } = require('./supabase')
    const { data } = await supabase
      .from('app_config')
      .select('key, value')
    if (!data) { _cache = {}; return _cache }
    _cache = Object.fromEntries(data.map(r => [r.key, r.value]))
  } catch {
    _cache = {}
  }
  return _cache
}

/** Retorna true si la beta sigue abierta (default true si no hay conexión) */
async function isBetaOpen() {
  const cfg = await fetchAppConfig()
  if (!('beta_open' in cfg)) return true   // sin conexión → dejar pasar
  return cfg.beta_open !== 'false'
}

/** Retorna la última versión publicada (string) o null */
async function getLatestVersion() {
  const cfg = await fetchAppConfig()
  return cfg.latest_version || null
}

/** Retorna la URL de descarga de la última versión */
async function getDownloadUrl() {
  const cfg = await fetchAppConfig()
  return cfg.download_url || 'https://github.com/AntonioPCGamer/NewGameRev/releases/latest'
}

/** Retorna la URL del ZIP de BIOS (null si no está configurada) */
async function getBiosUrl() {
  const cfg = await fetchAppConfig()
  return cfg.bios_url || null
}

/** Retorna la URL de descarga de juegos (solo para usuarios registrados) */
async function getGamesUrl() {
  const cfg = await fetchAppConfig()
  return cfg.games_url || null
}

module.exports = { isBetaOpen, getLatestVersion, getDownloadUrl, getBiosUrl, getGamesUrl }
