/**
 * saveSync.js — Sincroniza saves/states con Supabase Storage
 * Bucket: 'saves' (privado, un usuario solo accede a sus propios archivos)
 *
 * Estructura en Storage:
 *   {nickname}/mednafen/memory-cards/{archivo}.mcr    ← PS1 memory cards
 *   {nickname}/mednafen/states/{archivo}.mcs          ← Save states mednafen
 *   {nickname}/retroarch/saves/{archivo}.srm          ← Saves RetroArch
 *   {nickname}/retroarch/states/{archivo}.state*      ← States RetroArch
 */
const fs   = require('fs')
const path = require('path')

function getSupabase() {
  try { return require('./supabase').supabase } catch { return null }
}

function getUserKey() {
  try { return require('./userConfig').getLocalNick() || 'guest' } catch { return 'guest' }
}

const BASE = __dirname

// Directorios y extensiones por emulador
const SAVE_TARGETS = {
  mednafen: [
    {
      dir:   path.join(BASE, 'Emuladores', 'mednafen-1.32.1-win64', 'sav'),
      exts:  ['.mcr'],
      label: 'memory-cards'
    },
    {
      dir:   path.join(BASE, 'Emuladores', 'mednafen-1.32.1-win64', 'mcs'),
      exts:  ['.mcs'],
      label: 'states'
    }
  ],
  retroarch: [
    {
      dir:   path.join(BASE, 'Emuladores', 'RetroArch-Win64', 'saves'),
      exts:  ['.srm', '.sav', '.ram'],
      label: 'saves'
    },
    {
      dir:   path.join(BASE, 'Emuladores', 'RetroArch-Win64', 'states'),
      exts:  ['.state', '.state1', '.state2', '.state3', '.state4', '.state5'],
      label: 'states'
    }
  ]
}

/**
 * Sube todos los archivos de save de un juego al bucket 'saves'
 * @param {string} gameTitle - Título del juego (sin extensión)
 * @param {'mednafen'|'retroarch'} emulator
 */
async function uploadSaves(gameTitle, emulator = 'mednafen') {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'no_supabase' }

  const targets = SAVE_TARGETS[emulator] || []
  const userKey = getUserKey()
  let uploaded = 0

  for (const target of targets) {
    if (!fs.existsSync(target.dir)) continue

    const files = fs.readdirSync(target.dir).filter(f => {
      const ext = path.extname(f).toLowerCase()
      // Subir todos los archivos relacionados al juego o memory cards globales (mednafen usa un MCR por slot, no por juego)
      return target.exts.includes(ext)
    })

    for (const file of files) {
      try {
        const buffer = fs.readFileSync(path.join(target.dir, file))
        const storagePath = `${userKey}/${emulator}/${target.label}/${file}`
        const { error } = await supabase.storage
          .from('saves')
          .upload(storagePath, buffer, { upsert: true, contentType: 'application/octet-stream' })
        if (!error) uploaded++
      } catch(e) { console.error('uploadSaves error:', file, e.message) }
    }
  }

  return { ok: true, uploaded }
}

/**
 * Descarga los saves de un juego desde Supabase Storage
 * @param {string} gameTitle - Título del juego (sin extensión)
 * @param {'mednafen'|'retroarch'} emulator
 */
async function downloadSaves(gameTitle, emulator = 'mednafen') {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'no_supabase' }

  const targets = SAVE_TARGETS[emulator] || []
  const userKey = getUserKey()
  let downloaded = 0

  for (const target of targets) {
    if (!fs.existsSync(target.dir)) fs.mkdirSync(target.dir, { recursive: true })

    const prefix = `${userKey}/${emulator}/${target.label}/`
    const { data: list, error: listErr } = await supabase.storage.from('saves').list(prefix)
    if (listErr || !list) continue

    for (const item of list) {
      try {
        const storagePath = prefix + item.name
        const { data, error } = await supabase.storage.from('saves').download(storagePath)
        if (error || !data) continue
        const arrayBuffer = await data.arrayBuffer()
        fs.writeFileSync(path.join(target.dir, item.name), Buffer.from(arrayBuffer))
        downloaded++
      } catch(e) { console.error('downloadSaves error:', item.name, e.message) }
    }
  }

  return { ok: true, downloaded }
}

module.exports = { uploadSaves, downloadSaves }
