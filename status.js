const dgram = require('dgram')
const os = require('os')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const RETROARCH_PORT = 55355
const CONFIG_PATH = path.join(__dirname, 'RetroArch-Win64', 'retroarch.cfg')

// ─── UTILIDAD: enviar comando UDP a RetroArch y esperar respuesta ───
function enviarComando(comando) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4')
    const timeout = setTimeout(() => {
      client.close()
      resolve(null)
    }, 1000)

    client.on('message', (msg) => {
      clearTimeout(timeout)
      client.close()
      resolve(msg.toString())
    })

    client.send(comando, RETROARCH_PORT, 'localhost', (err) => {
      if (err) {
        clearTimeout(timeout)
        client.close()
        resolve(null)
      }
    })
  })
}

// ─── 1. Emulador activo o no ───
async function getEstadoEmulador() {
  const res = await enviarComando('GET_STATUS')
  if (!res) return { activo: false, estado: 'Apagado' }
  return { activo: true, estado: res.trim() }
}

// ─── 2. Mandos conectados ───
function getMandos() {
  const mandos = []

  const MANDOS_CONOCIDOS = [
    { vid: 'VID_054C&PID_0CDA', nombre: 'DualSense PlayStation' },
    { vid: 'VID_054C&PID_0CE6', nombre: 'DualSense PlayStation' },
    { vid: 'VID_054C&PID_09CC', nombre: 'DualSense PlayStation' },
    { vid: 'VID_054C&PID_05C4', nombre: 'DualSense PlayStation' },
    { vid: 'VID_054C&PID_0268', nombre: 'DualSense PlayStation' },
    { vid: 'VID_045E&PID_0B12', nombre: 'Xbox Series X/S Controller' },
    { vid: 'VID_045E&PID_02EA', nombre: 'Xbox One S Controller' },
    { vid: 'VID_045E&PID_02FF', nombre: 'Xbox One Controller' },
    { vid: 'VID_045E&PID_028E', nombre: 'Xbox 360 Controller' },
    { vid: 'VID_045E&PID_0719', nombre: 'Xbox 360 Wireless' },
    { vid: 'VID_057E&PID_2009', nombre: 'Nintendo Switch Pro Controller' },
    { vid: 'VID_057E&PID_2006', nombre: 'Joy-Con (L)' },
    { vid: 'VID_057E&PID_2007', nombre: 'Joy-Con (R)' },
    { vid: 'VID_057E&PID_0337', nombre: 'GameCube Controller Adapter' },
    { vid: 'VID_0079&PID_0011', nombre: 'NES/SNES USB Controller' },
    { vid: 'VID_0079&PID_1800', nombre: 'SNES USB Controller' },
    { vid: 'VID_0079&PID_0006', nombre: 'NES USB Controller' },
  ]

  try {
    const result = execSync(
      `powershell -command "Get-PnpDevice | Where-Object {$_.Class -eq 'HIDClass' -and $_.Status -eq 'OK'} | Select-Object FriendlyName, HardwareID | ConvertTo-Json"`,
      { timeout: 3000 }
    ).toString()
    const parsed = JSON.parse(result)
    const lista = Array.isArray(parsed) ? parsed : [parsed]

    lista.forEach(d => {
      const hwid = Array.isArray(d.HardwareID) ? d.HardwareID.join(' ') : (d.HardwareID || '')
      if (!hwid.includes('HID_DEVICE_SYSTEM_GAME')) return
      const encontrado = MANDOS_CONOCIDOS.find(m => hwid.includes(m.vid))
      if (encontrado) {
        mandos.push(encontrado.nombre)
      } else {
        mandos.push('Mando USB Genérico')
      }
    })
  } catch (err) {
    console.error(err)
  }

  return {
    cantidad: mandos.length,
    mandos: mandos.length > 0 ? mandos : ['No detectados']
  }
}

// ─── 3. FPS actual ───
async function getFPS() {
  const res = await enviarComando('GET_STATUS')
  if (!res) return { fps: 0 }
  const match = res.match(/,([\d.]+)$/)
  return { fps: match ? Math.round(parseFloat(match[1])) : 0 }
}

// ─── 4. Juego activo ───
async function getJuegoActivo() {
  const res = await enviarComando('GET_STATUS')
  if (!res) return { jugando: false, juego: null }
  const match = res.match(/PLAYING (.+),/)
  if (!match) return { jugando: false, juego: null }
  const rutaJuego = match[1].trim()
  const nombreJuego = path.basename(rutaJuego)
  return { jugando: true, juego: nombreJuego, ruta: rutaJuego }
}

// ─── 5. BIOS detectada ───
function getBIOS() {
  const systemDir = path.join(__dirname, 'RetroArch-Win64', 'system')
  const biosConocidas = [
    'scph5500.bin', 'scph5501.bin', 'scph5502.bin',
    'scph1001.bin', 'scph7001.bin'
  ]
  const encontradas = []
  biosConocidas.forEach(bios => {
    const rutaBios = path.join(systemDir, bios)
    if (fs.existsSync(rutaBios)) encontradas.push(bios)
  })
  return {
    encontradas,
    ok: encontradas.length > 0
  }
}

// ─── 6. RAM (CPU ahora viene del navegador) ───
function getRAM() {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memPorcentaje = ((usedMem / totalMem) * 100).toFixed(1)

  return {
    ram: `${(usedMem / 1024 / 1024 / 1024).toFixed(1)}GB / ${(totalMem / 1024 / 1024 / 1024).toFixed(1)}GB`,
    ramPorcentaje: `${memPorcentaje}%`
  }
}

// ─── CPU en tiempo real ───
function getCPU() {
  return new Promise((resolve) => {
    const cpus1 = os.cpus()
    setTimeout(() => {
      const cpus2 = os.cpus()
      let totalDiff = 0
      let idleDiff = 0
      cpus1.forEach((cpu, i) => {
        const total1 = Object.values(cpu.times).reduce((a, b) => a + b, 0)
        const total2 = Object.values(cpus2[i].times).reduce((a, b) => a + b, 0)
        totalDiff += total2 - total1
        idleDiff += cpus2[i].times.idle - cpu.times.idle
      })
      const uso = ((1 - idleDiff / totalDiff) * 100).toFixed(1)
      resolve(uso + '%')
    }, 500)
  })
}


// ─── 7. Latencia / Internet ───
async function getLatencia() {
  return new Promise((resolve) => {
    const start = Date.now()
    const client = dgram.createSocket('udp4')
    client.send('ping', 53, '8.8.8.8', (err) => {
      if (err) {
        client.close()
        return resolve({ ms: 9999, estado: 'Sin conexión' })
      }
    })
    setTimeout(() => {
      const ms = Date.now() - start
      client.close()
      resolve({
        ms,
        estado: ms < 50 ? 'Excelente' : ms < 100 ? 'Bueno' : ms < 300 ? 'Regular' : 'Malo'
      })
    }, 500)
  })
}

// ─── 8. NickName ───
function getNickName() {
  try {
    const config = fs.readFileSync(CONFIG_PATH, 'utf8')
    const match = config.match(/netplay_nickname\s*=\s*"(.+)"/)
    return match ? match[1] : 'Anónimo'
  } catch {
    return 'Anónimo'
  }
}

function setNickName(nuevoNick) {
  try {
    let config = fs.readFileSync(CONFIG_PATH, 'utf8')
    if (config.includes('netplay_nickname')) {
      config = config.replace(/netplay_nickname\s*=\s*".+"/, `netplay_nickname = "${nuevoNick}"`)
    } else {
      config += `\nnetplay_nickname = "${nuevoNick}"`
    }
    fs.writeFileSync(CONFIG_PATH, config, 'utf8')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── 9. Contraseña ───
function getPassword() {
  try {
    const config = fs.readFileSync(CONFIG_PATH, 'utf8')
    const match = config.match(/netplay_password\s*=\s*"(.*)"/)
    return match ? match[1] : ''
  } catch {
    return ''
  }
}

function setPassword(nuevaPassword) {
  try {
    let config = fs.readFileSync(CONFIG_PATH, 'utf8')
    if (config.includes('netplay_password')) {
      config = config.replace(/netplay_password\s*=\s*".*"/, `netplay_password = "${nuevaPassword}"`)
    } else {
      config += `\nnetplay_password = "${nuevaPassword}"`
    }
    fs.writeFileSync(CONFIG_PATH, config, 'utf8')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── FUNCIÓN PRINCIPAL ───
async function getStatus() {
  const [emulador, fps, juego, latencia] = await Promise.all([
    getEstadoEmulador(),
    getFPS(),
    getJuegoActivo(),
    getLatencia()
  ])

  return {
    emulador,
    mandos: getMandos(),
    fps,
    juego,
    bios: getBIOS(),
    sistema: getRAM(),
    latencia,
    nick: getNickName(),
    password: getPassword()
  }
}

module.exports = {
  getStatus,
  getNickName,
  setNickName,
  getPassword,
  setPassword,
  getEstadoEmulador,
  getMandos,
  getFPS,
  getJuegoActivo,
  getBIOS,
  getCPU,
  getRAM,
  getLatencia
} 