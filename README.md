<div align="center">

<img src="pngLogos/logo.png" alt="GamingRevs Logo" width="100" />

# GamingRevs

**Lanzador de juegos PS1 con multijugador en línea**

[![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)](https://www.electronjs.org/)
[![Mednafen](https://img.shields.io/badge/Emulator-Mednafen%20PSX-blue?style=for-the-badge)](https://mednafen.github.io/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://www.microsoft.com/windows)

</div>

---

## ¿Qué es GamingRevs?

GamingRevs es una app de escritorio para Windows que convierte tu colección de juegos PS1 en una biblioteca moderna. Puedes jugar solo o invitar amigos a partidas online con un simple código de sala, todo desde una interfaz limpia con soporte de mando.

<div align="center">
<table>
<tr>
<td align="center"><strong>🎮 Biblioteca</strong><br/>Vista lista y grilla</td>
<td align="center"><strong>🌐 Netplay</strong><br/>Online con código de sala</td>
<td align="center"><strong>👥 Amigos</strong><br/>Sistema de amigos en tiempo real</td>
<td align="center"><strong>🕹️ Mando</strong><br/>Navegación completa con gamepad</td>
</tr>
</table>
</div>

---

## Características

- **Biblioteca de juegos** — Escanea tu carpeta `games/` automáticamente y muestra los juegos en lista o grilla
- **Juego en solitario** — Lanza juegos PS1 directamente con Mednafen
- **Multijugador online** — Crea una sala con código y compártelo con un amigo para jugar en red
- **Sistema de amigos** — Agrega amigos, ve quién está online, invítalos a partidas
- **Soporte de mando** — Navega todo con D-Pad, A, B; el botón Start abre el detector de mandos
- **Sesión guardada** — La sesión se recuerda entre reinicios, no tienes que iniciar sesión cada vez
- **Nickname local** — Tu nombre se guarda localmente, funciona aunque Supabase no esté disponible

---

## Requisitos

| Requisito | Versión |
|-----------|---------|
| Windows | 10 / 11 |
| Node.js | 18+ |
| Mednafen | Incluido en `Emuladores/` |

### BIOS de PS1 (obligatorio)

Coloca al menos una de estas BIOS en `Emuladores/mednafen-1.32.1-win64/firmware/`:

```
scph5500.bin   (NTSC-J)
scph5501.bin   (NTSC-U/C)  ← recomendada
scph5502.bin   (PAL)
scph1001.bin
scph7001.bin
```

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/AntonioPCGamer/NewGameRev.git
cd NewGameRev

# 2. Instalar dependencias
npm install

# 3. Agregar tus juegos
# Crea una carpeta por juego dentro de games/
# Cada carpeta debe contener un archivo .cue
#
# games/
# ├── Crash Bandicoot/
# │   └── crash.cue
# └── Metal Gear Solid/
#     └── mgs.cue

# 4. Iniciar la app
npm start
# (o doble click en run.bat — recomendado)
```

---

## Estructura del proyecto

```
NewGameRev/
├── main.js                  # Proceso principal de Electron (IPC, ventana)
├── gameOnly.js              # Lanzador de juegos (Mednafen / RetroArch)
├── status.js                # Detección de mandos, lectura de retroarch.cfg
├── configManager.js         # Configs de RetroArch (offline.cfg / online.cfg)
├── userConfig.js            # Nickname local (userData.json)
├── friendsManager.js        # Amigos, presencia e invitaciones (Supabase)
├── supabase.js              # Cliente de Supabase
├── supabaseAuth.js          # Login, registro, perfil
├── supabaseConfig.js        # URL y clave anon de Supabase
│
├── html/
│   ├── login.html           # Pantalla de login / registro
│   ├── mainLobby.html       # Biblioteca principal de juegos
│   ├── GameModeSelection.html  # Selección Solo / Online
│   ├── MultiplayerLobby.html   # Crear / unirse a sala
│   └── gamepadDetector.html    # Detector visual de botones del mando
│
├── games/                   # Tus juegos van aquí (una carpeta por juego)
├── Emuladores/
│   ├── mednafen-1.32.1-win64/  # Mednafen para PS1 y netplay
│   └── RetroArch-Win64/         # RetroArch (otros sistemas)
│
├── cfgigual.txt             # Baseline de retroarch.cfg (fuente de verdad)
├── run.bat                  # Inicio recomendado (sincroniza cfg + lanza app)
└── userData.json            # Nickname guardado localmente (se crea al primer uso)
```

---

## Multijugador

GamingRevs usa **Mednafen** para el netplay PS1. El servidor relay está en Lima, Perú.

### Crear sala (Host)

1. Selecciona un juego → **Online**
2. Haz clic en **Crear Sala**
3. Comparte el código de 6 letras con tu amigo
4. El juego inicia automáticamente

### Unirse a sala (Guest)

1. Selecciona el **mismo juego** → **Online**
2. Haz clic en **Unirse**
3. Ingresa el código que te pasó tu amigo
4. Conectar

> **Importante:** Ambos jugadores deben tener exactamente la misma ROM (mismo archivo `.cue` y `.bin`).

---

## Configuración de retroarch.cfg

Edita siempre **`cfgigual.txt`** (no `retroarch.cfg` directamente). Al iniciar con `run.bat`, el archivo se sincroniza automáticamente.

Configuración clave para el netplay (servidor Lima, Perú):

```ini
netplay_mitm_server = "custom"
netplay_custom_mitm_server = "38.250.116.33"
netplay_use_mitm_server = "true"
netplay_check_frames = 60
netplay_max_ping = 175
```

---

## Controles con mando (en la app)

| Botón | Acción |
|-------|--------|
| D-Pad / Stick izq. | Navegar |
| **A** (Cruz) | Confirmar / Abrir |
| **B** (Círculo) | Volver |
| **Y** (Triángulo) | Cambiar vista lista/grilla |
| **Start** | Detector de mandos *(solo en biblioteca)* |

---

## Supabase (funciones online)

Las funciones de amigos e invitaciones usan Supabase. Configura tus credenciales en `supabaseConfig.js`:

```js
const SUPABASE_URL  = 'https://tu-proyecto.supabase.co'
const SUPABASE_ANON = 'tu-anon-key'
```

Ejecuta los SQL de configuración en el panel de Supabase:
1. `supabase_setup.sql` — Tablas de perfiles y saves
2. `supabase_friends_setup.sql` — Amigos, presencia e invitaciones

> La app funciona **sin Supabase** para jugar en solitario. Solo se necesita para amigos y multijugador con invitaciones.

---

## Tecnologías

- [Electron](https://www.electronjs.org/) — Framework de desktop
- [Mednafen](https://mednafen.github.io/) — Emulador PS1 con netplay
- [RetroArch](https://www.retroarch.com/) — Emulador multi-sistema
- [Supabase](https://supabase.com/) — Backend para auth, amigos y presencia
- [Tailwind CSS](https://tailwindcss.com/) — Estilos de la interfaz
- [netplay-mitm-server](https://github.com/libretro/netplay-mitm-server) — Relay de netplay en Lima, Perú

---

## Licencia

Proyecto privado — AntonioPCGamer © 2025
