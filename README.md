<div align="center">

<img src="pngLogos/logo.png" alt="GamingRevs Logo" width="100" />

# GamingRevs

**Lanzador de juegos retro con multijugador online — Beta**

[![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)](https://www.electronjs.org/)
[![Mednafen](https://img.shields.io/badge/PS1-Mednafen-blue?style=for-the-badge)](https://mednafen.github.io/)
[![RetroArch](https://img.shields.io/badge/Multisistema-RetroArch-black?style=for-the-badge)](https://www.retroarch.com/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://www.microsoft.com/windows)

</div>

---

## ¿Qué es GamingRevs?

GamingRevs es una app de escritorio para Windows que convierte tu colección de juegos retro en una biblioteca moderna. Juega solo o invita amigos a partidas online con un simple código de sala, todo desde una interfaz limpia con soporte completo de mando.

<div align="center">
<table>
<tr>
<td align="center"><strong>🎮 Biblioteca</strong><br/>Lista y grilla, búsqueda</td>
<td align="center"><strong>🌐 Netplay</strong><br/>Online 2 y 4 jugadores</td>
<td align="center"><strong>👥 Amigos</strong><br/>Sistema en tiempo real</td>
<td align="center"><strong>☁️ Cloud Saves</strong><br/>Saves en Supabase Storage</td>
</tr>
</table>
</div>

---

## Características

- **Biblioteca de juegos** — Detecta juegos automáticamente por carpetas. Carpeta personalizable sin tocar código.
- **PS1 con Mednafen** — Lanza juegos `.cue` directamente. Netplay 2 jugadores vía servidor relay.
- **Multisistema con RetroArch** — NES, SNES, GBA, N64, Mega Drive, Saturn, PS2 y más. Cores descargables desde la app.
- **Netplay 4 jugadores** — Host/cliente con RetroArch para partidas de hasta 4 personas.
- **Sistema de amigos** — Agrega amigos, ve quién está online e invítalos a partidas en tiempo real.
- **Cloud saves** — Los saves y estados se sincronizan automáticamente en Supabase Storage al salir del juego.
- **Modo invitado** — Entra con un apodo sin necesidad de cuenta registrada (mientras la beta esté abierta).
- **Control remoto por Supabase** — Beta open/close, versión, servidores de netplay y URLs de descarga se gestionan desde Supabase sin editar código.
- **Mando completo** — Navega toda la app con D-Pad, A, B y Start.

---

## Requisitos

| Requisito | Versión |
|-----------|---------|
| Windows | 10 / 11 (64-bit) |
| Node.js | 18+ *(solo para desarrollo)* |
| Mednafen | 1.32.1 — incluido en `Emuladores/` |
| RetroArch | Incluido en `Emuladores/` |

---

## Instalación (usuarios finales)

1. Descarga el instalador `.exe` desde la sección [Releases](https://github.com/AntonioPCGamer/NewGameRev/releases/latest)
2. Instala y abre **GamingRevs**
3. La app descarga las BIOS automáticamente si falta alguna
4. Coloca tus juegos en la carpeta que elijas (ver abajo)

---

## Instalación (desarrollo)

```bash
git clone https://github.com/AntonioPCGamer/NewGameRev.git
cd NewGameRev
npm install
npm start
```

---

## Organización de juegos

Cada juego debe estar en su propia carpeta con su `.cue` y `.bin`:

```
games/
├── PS1/
│   ├── Crash Bandicoot/
│   │   ├── crash.cue
│   │   └── crash.bin
│   └── Metal Gear Solid/
│       ├── mgs.cue
│       └── mgs.bin
└── NES/
    └── Super Mario/
        └── mario.nes
```

La carpeta `games/` es el directorio por defecto. Puedes cambiarla desde la app (botón **Carpeta de Juegos** en el sidebar) sin tocar código.

---

## BIOS

### PS1 (Mednafen)
La app descarga las BIOS automáticamente desde la URL configurada en Supabase (`bios_url`). Se instalan en:
- `Emuladores/mednafen-1.32.1-win64/firmware/`
- `Emuladores/RetroArch-Win64/system/`

Archivos requeridos: `scph5500.bin`, `scph5501.bin`, `scph5502.bin`

### Otras consolas (RetroArch)
| Consola | BIOS | Obligatoria |
|---------|------|-------------|
| Saturn | `sega_101.bin`, `mpr-17933.bin` | Sí |
| PS2 | cualquier dump `SCPH-XXXXX.bin` | Sí |
| GBA | `gba_bios.bin` | Recomendada |
| NES / SNES / Mega Drive | — | No |

Colócalas en `Emuladores/RetroArch-Win64/system/`.

---

## Multijugador

### 2 jugadores — Mednafen (PS1)

1. Selecciona un juego → **Online** → **Crear Sala** → elige **2 Jugadores**
2. Comparte el código de 6 letras con tu amigo
3. El amigo va a **Unirse** e ingresa el código
4. El juego inicia automáticamente en ambos

> Ambos deben tener exactamente la misma ROM (mismo `.cue` + `.bin`).

### 4 jugadores — RetroArch

1. Selecciona un juego → **Online** → **Crear Sala** → elige **4 Jugadores**
2. Comparte tu IP con los demás jugadores
3. Los demás van a **Unirse** e ingresan tu IP

> ⚠️ El modo 4 jugadores puede tener más lag. Recomendado para redes locales o conexiones de baja latencia.

---

## Servidores de netplay (gestionados desde Supabase)

Los servidores se configuran en la tabla `app_config` de Supabase. Si no hay valor, se usa el servidor por defecto:

| Key Supabase | Default | Uso |
|---|---|---|
| `mednafen_netplay_host` | `netplay.fobby.net` | Relay PS1 2-player |
| `mednafen_netplay_port` | `4046` | Puerto relay PS1 |
| `retroarch_mitm_host` | `38.250.116.33` | MITM RetroArch (Lima, Perú) |
| `retroarch_mitm_port` | `55435` | Puerto MITM |

Para cambiar a tu propio servidor, inserta en Supabase:

```sql
INSERT INTO app_config (key, value) VALUES
  ('mednafen_netplay_host', 'tu.servidor.com'),
  ('mednafen_netplay_port', '4046'),
  ('retroarch_mitm_host',   'tu.servidor.com'),
  ('retroarch_mitm_port',   '55435');
```

---

## Control remoto desde Supabase (`app_config`)

| Key | Valor de ejemplo | Efecto |
|-----|-----------------|--------|
| `beta_open` | `"true"` / `"false"` | Abre o cierra la beta para todos |
| `latest_version` | `"0.75"` | Activa el toast de nueva versión |
| `download_url` | URL del release | Link del botón de descarga |
| `bios_url` | URL base de BIOS | Descarga automática de BIOS |
| `games_url` | URL de Drive | Link visible solo para registrados |
| `mednafen_netplay_host` | hostname | Servidor relay de mednafen |
| `mednafen_netplay_port` | `"4046"` | Puerto del relay |
| `retroarch_mitm_host` | hostname | Servidor MITM de RetroArch |
| `retroarch_mitm_port` | `"55435"` | Puerto del MITM |

---

## Versiones de los emuladores

Los emuladores están **empaquetados dentro del instalador**. No se actualizan de forma independiente.

Para actualizar un emulador:
1. Reemplaza los archivos en `Emuladores/mednafen-1.32.1-win64/` o `Emuladores/RetroArch-Win64/`
2. Actualiza el nombre de la carpeta en el código si cambia la versión
3. Genera un nuevo instalador (`npm run build:win`)
4. Publica un nuevo release en GitHub y actualiza `latest_version` en Supabase

---

## Cores de RetroArch

Los cores se descargan desde la app (botón **Cores** en el sidebar) o manualmente desde [buildbot.libretro.com](https://buildbot.libretro.com/nightly/windows/x86_64/latest/).

Colócalos en `Emuladores/RetroArch-Win64/cores/`.

| Core | Consola | Netplay |
|------|---------|---------|
| `nestopia_libretro.dll` | NES | ✅ |
| `snes9x_libretro.dll` | SNES | ✅ |
| `mgba_libretro.dll` | GBA | ✅ |
| `gambatte_libretro.dll` | Game Boy / GBC | ✅ |
| `genesis_plus_gx_libretro.dll` | Mega Drive | ✅ |
| `fbneo_libretro.dll` | Arcade / Neo Geo | ✅ |
| `mednafen_saturn_libretro.dll` | Saturn | ✅ |
| `mupen64plus_next_libretro.dll` | N64 | — |
| `desmume_libretro.dll` | Nintendo DS | — |
| `pcsx2_libretro.dll` | PS2 | — |

---

## Controles con mando (en la app)

| Botón | Acción |
|-------|--------|
| D-Pad / Stick izq. | Navegar |
| **A** (Cruz) | Confirmar / Abrir |
| **B** (Círculo) | Volver |
| **Y** (Triángulo) | Cambiar vista lista/grilla |
| **Start** | Detector de mandos |

---

## Estructura del proyecto

```
NewGameRev/
├── main.js              # Proceso principal Electron (IPC, ventana, descargas)
├── gameOnly.js          # Lanzador de juegos (Mednafen / RetroArch / netplay)
├── appConfig.js         # Config remota desde Supabase (beta, versión, servidores)
├── userConfig.js        # Config local (nick, carpeta de juegos, modo invitado)
├── saveSync.js          # Sync de saves/states con Supabase Storage
├── coreDownloader.js    # Descarga de cores desde buildbot libretro
├── configManager.js     # Args --appendconfig para RetroArch (offline/online)
├── status.js            # UDP a RetroArch, lectura de retroarch.cfg
├── friendsManager.js    # Amigos, presencia e invitaciones (Supabase Realtime)
├── supabaseAuth.js      # Login, registro, perfil, check de username
├── supabase.js          # Cliente Supabase
├── supabaseConfig.js    # URL y anon key de Supabase
│
├── html/
│   ├── login.html              # Login / Registro / Modo invitado
│   ├── mainLobby.html          # Biblioteca principal
│   ├── GameModeSelection.html  # Selección Solo / Online
│   ├── MultiplayerLobby.html   # Crear / unirse a sala (2p o 4p)
│   └── gamepadDetector.html    # Detector visual de botones
│
├── Emuladores/
│   ├── mednafen-1.32.1-win64/  # Emulador PS1 + netplay 2p
│   │   ├── firmware/           # BIOS (no en el repo — se descargan)
│   │   ├── sav/                # Memory cards (sync con Supabase)
│   │   └── mcs/                # Save states (sync con Supabase)
│   └── RetroArch-Win64/        # Emulador multi-sistema
│       ├── cores/              # Cores de emulación (descargables)
│       ├── system/             # BIOS de otras consolas
│       ├── saves/              # Saves (sync con Supabase)
│       └── states/             # States (sync con Supabase)
│
├── games/               # Juegos del usuario (no en el repo)
├── pngLogos/            # Logos y portadas de juegos
└── run.bat              # Inicio recomendado
```

---

## Supabase — Setup

Configura tus credenciales en `supabaseConfig.js`:

```js
const SUPABASE_URL  = 'https://tu-proyecto.supabase.co'
const SUPABASE_ANON = 'tu-anon-key'
```

Ve a **Supabase → SQL Editor** y ejecuta en orden:
1. `supabase_setup.sql` — Todo de una vez: tablas, RLS, Storage, y config de la app
2. `supabase_friends_setup.sql` — Sistema de amigos y presencia en tiempo real

### Lo único que debes completar en `app_config`

| Key | Qué poner |
|-----|-----------|
| `bios_url` | URL base de tus BIOS (archive.org u otro) |
| `games_url` | Link de Drive con los juegos (solo registrados) |
| `retroarch_mitm_host` | Tu IP cuando tengas servidor — `null` = público |
| `mednafen_netplay_host` | Tu IP cuando tengas servidor — `null` = público |

Cambiar servidor cuando tengas el tuyo propio:
```sql
UPDATE app_config SET value = 'tu.ip.o.dominio' WHERE key = 'retroarch_mitm_host';
UPDATE app_config SET value = 'tu.ip.o.dominio' WHERE key = 'mednafen_netplay_host';
-- Volver al público:
UPDATE app_config SET value = null WHERE key IN ('retroarch_mitm_host','mednafen_netplay_host');
```

> La app funciona sin Supabase para jugar solo. Solo se necesita para auth, amigos y sync de saves.

---

## Tecnologías

- [Electron](https://www.electronjs.org/) — Framework de desktop
- [Mednafen](https://mednafen.github.io/) — Emulador PS1 con netplay
- [RetroArch](https://www.retroarch.com/) — Emulador multi-sistema
- [Supabase](https://supabase.com/) — Auth, amigos, presencia, Storage y config remota
- [Tailwind CSS](https://tailwindcss.com/) — Estilos
- [netplay-mitm-server](https://github.com/libretro/netplay-mitm-server) — Relay MITM propio en Lima, Perú

---

## Licencia

Proyecto privado — AntonioPCGamer © 2025
