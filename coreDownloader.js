/**
 * coreDownloader.js — Descarga cores desde el buildbot de libretro
 * URL base: https://buildbot.libretro.com/nightly/windows/x86_64/latest/
 */
const https = require('https')
const fs = require('fs')
const path = require('path')

const BUILDBOT = 'https://buildbot.libretro.com/nightly/windows/x86_64/latest/'

const CORES_DIR = path.join(__dirname, 'Emuladores', 'RetroArch-Win64', 'cores')

// Cores a descargar: { nombre_dll, descripción, mejor_para_netplay }
const AVAILABLE_CORES = [
  { dll: 'nestopia_libretro.dll',          label: 'NES — Nestopia',              netplay: true  },
  { dll: 'snes9x_libretro.dll',            label: 'SNES — Snes9x',              netplay: true  },
  { dll: 'mgba_libretro.dll',              label: 'GBA — mGBA',                  netplay: true  },
  { dll: 'gambatte_libretro.dll',          label: 'Game Boy / GBC — Gambatte',   netplay: true  },
  { dll: 'genesis_plus_gx_libretro.dll',   label: 'Mega Drive — Genesis Plus GX',netplay: true  },
  { dll: 'mupen64plus_next_libretro.dll',  label: 'N64 — Mupen64Plus Next',      netplay: false },
  { dll: 'fbneo_libretro.dll',             label: 'Arcade / Neo Geo — FBNeo',    netplay: true  },
  { dll: 'mednafen_saturn_libretro.dll',   label: 'Saturn — Mednafen Saturn',    netplay: true  },
  { dll: 'desmume_libretro.dll',           label: 'Nintendo DS — DeSmuME',       netplay: false },
  { dll: 'pcsx2_libretro.dll',             label: 'PS2 — PCSX2',                 netplay: false },
]

/**
 * Verifica cuáles cores ya están instalados
 */
function getInstalledCores() {
  if (!fs.existsSync(CORES_DIR)) return []
  return fs.readdirSync(CORES_DIR).filter(f => f.endsWith('.dll'))
}

/**
 * Descarga y extrae un core desde el buildbot
 * @param {string} dll - nombre del archivo dll (ej: nestopia_libretro.dll)
 * @param {function} onProgress - callback(percent)
 */
async function downloadCore(dll, onProgress) {
  const zipName = dll + '.zip'
  const url = BUILDBOT + zipName
  const tmpZip = path.join(CORES_DIR, '__tmp_' + zipName)
  const destDll = path.join(CORES_DIR, dll)

  if (!fs.existsSync(CORES_DIR)) fs.mkdirSync(CORES_DIR, { recursive: true })

  // Descargar zip
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tmpZip)
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.close()
        fs.unlink(tmpZip, () => {})
        return reject(new Error(`HTTP ${res.statusCode} para ${dll}`))
      }
      const total = parseInt(res.headers['content-length'] || '0', 10)
      let received = 0
      res.on('data', chunk => {
        received += chunk.length
        if (total > 0 && onProgress) onProgress(Math.round(received / total * 100))
      })
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
      file.on('error', err => { fs.unlink(tmpZip, () => {}); reject(err) })
    }).on('error', err => { fs.unlink(tmpZip, () => {}); reject(err) })
  })

  // Extraer dll del zip usando yauzl
  const yauzl = require('yauzl')
  await new Promise((resolve, reject) => {
    yauzl.open(tmpZip, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err)
      zipfile.readEntry()
      zipfile.on('entry', (entry) => {
        if (entry.fileName.endsWith('.dll')) {
          zipfile.openReadStream(entry, (err, stream) => {
            if (err) return reject(err)
            const out = fs.createWriteStream(destDll)
            stream.pipe(out)
            out.on('finish', () => { zipfile.close(); resolve() })
            out.on('error', reject)
          })
        } else {
          zipfile.readEntry()
        }
      })
      zipfile.on('end', resolve)
      zipfile.on('error', reject)
    })
  })

  fs.unlink(tmpZip, () => {})
  return { ok: true, dll }
}

module.exports = { AVAILABLE_CORES, getInstalledCores, downloadCore }
