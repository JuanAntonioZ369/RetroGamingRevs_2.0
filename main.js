const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('Guia/mainLobby.html'); // Carga tu HTML existente
}

function getGamesList() {
  const gamesDir = path.join(__dirname, 'games');
  const games = [];
  try {
    const folders = fs.readdirSync(gamesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    folders.forEach(folder => {
      const folderPath = path.join(gamesDir, folder);
      const files = fs.readdirSync(folderPath);
      const cueFile = files.find(file => file.endsWith('.cue'));
      if (cueFile) {
        games.push({
          title: folder,
          romPath: folder + '/' + cueFile  
        });
      }
    });
  } catch (err) {
    console.error('Error leyendo games:', err);
  }
  return games;
}

app.whenReady().then(() => {
    createWindow();
    // Enviar lista de juegos al renderer cuando se carga mainLobby
    mainWindow.webContents.on('dom-ready', () => {
      const url = mainWindow.webContents.getURL();
      if (url.includes('mainLobby.html')) {
        const games = getGamesList();
        mainWindow.webContents.send('games-list', games);
      }
    });
    // Iniciar host automáticamente para un juego
    // startNetplay('host', null, '55435', 'games/WinningEleven4/Winning Eleven 4 - full english names by xhk007 v1.0.cue', 'nyc'); // Para WAN
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Función para iniciar RetroArch con netplay
ipcMain.handle('start-netplay', async (event, { mode, ip, port, romPath, mitmServer }) => {
  const retroarchPath = path.join(__dirname, 'RetroArch-Win64', 'retroarch.exe');
  const corePath = path.join(__dirname, 'RetroArch-Win64', 'cores', 'mednafen_psx_libretro.dll');
  const fullRomPath = path.join(__dirname, 'games', romPath);

  let args = ['--core', corePath, fullRomPath];

  if (mode === 'host') {
    args.push('--host');
    if (mitmServer) {
      args.push('--netplay-mitm-server', mitmServer);
    } else {
      args.push('--port', port);
    }
  } else if (mode === 'client') {
    args.push('--connect', ip, '--port', port);
    if (mitmServer) {
      args.push('--netplay-mitm-server', mitmServer);
    }
  }

  console.log('Ejecutando RetroArch con args:', args);

  const retroarch = spawn(retroarchPath, args, { stdio: 'inherit' });

  retroarch.on('close', (code) => {
    console.log(`RetroArch cerró con código ${code}`);
  });

  retroarch.on('error', (err) => {
    console.error('Error al ejecutar RetroArch:', err);
  });

  return { success: true };
});