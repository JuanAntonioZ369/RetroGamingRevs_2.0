const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { getNickName } = require('./status');
const { startNetplay, killCurrentGame } = require('./gameOnly');
const { getGamesDir, setGamesDir } = require('./userConfig');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'pngLogos/logoPrimary.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('html/login.html');
}

// ─── Detectar en qué página estamos ───
function getPageName(url) {
  if (url.includes('html/login')) return 'login';
  if (url.includes('html/mainLobby')) return 'mainLobby';
  if (url.includes('html/gameModeSelection')) return 'gameModeSelection';
  if (url.includes('html/MultiplayerLobby')) return 'MultiplayerLobby';
  if (url.includes('html/gamepadDetector')) return 'gamepadDetector';
  return null;
}

function getGamesList() {
  const savedDir = getGamesDir();
  const gamesDir = (savedDir && fs.existsSync(savedDir)) ? savedDir : path.join(__dirname, 'games');
  const folders = [];
  const otrosGames = [];
  try {
    const topLevel = fs.readdirSync(gamesDir, { withFileTypes: true });

    // .cue files directly in games/ root → "Otros"
    topLevel
      .filter(f => f.isFile() && f.name.endsWith('.cue'))
      .forEach(f => {
        otrosGames.push({ title: f.name.replace('.cue', ''), romPath: f.name });
      });

    topLevel
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .forEach(folderName => {
        const folderPath = path.join(gamesDir, folderName);
        const contents = fs.readdirSync(folderPath, { withFileTypes: true });

        // If folder directly contains a .cue, it's a single-game folder
        const directCue = contents.find(f => f.isFile() && f.name.endsWith('.cue'));
        if (directCue) {
          folders.push({
            name: folderName,
            games: [{ title: folderName, romPath: folderName + '/' + directCue.name }]
          });
        } else {
          // Category folder — scan subfolders for games
          const games = [];
          contents.filter(d => d.isDirectory()).forEach(sub => {
            const subPath = path.join(folderPath, sub.name);
            const subFiles = fs.readdirSync(subPath);
            const cue = subFiles.find(f => f.endsWith('.cue'));
            if (cue) {
              games.push({ title: sub.name, romPath: folderName + '/' + sub.name + '/' + cue });
            }
          });
          if (games.length > 0) {
            folders.push({ name: folderName, games });
          } else {
            // Folder with no recognized games → "Otros"
            otrosGames.push(...contents
              .filter(f => f.isFile() && f.name.endsWith('.cue'))
              .map(f => ({ title: f.name.replace('.cue', ''), romPath: folderName + '/' + f.name }))
            );
          }
        }
      });
  } catch (err) {
    console.error('Error leyendo games:', err);
  }
  if (otrosGames.length > 0) {
    folders.push({ name: 'Otros', games: otrosGames });
  }
  return folders;
}

app.whenReady().then(() => {
  createWindow();

  mainWindow.webContents.on('dom-ready', () => {
    const url = mainWindow.webContents.getURL();
    const page = getPageName(url);

    // Enviar lista de juegos solo en mainLobby
    if (page === 'mainLobby') {
      const folders = getGamesList();
      mainWindow.webContents.send('folders-list', folders);
    }
    // login no necesita datos del main process
  });

  mainWindow.on('closed', () => {});
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('request-games', async () => {
  return getGamesList();
});

ipcMain.handle('get-games-dir', async () => {
  const savedDir = getGamesDir();
  return (savedDir && fs.existsSync(savedDir)) ? savedDir : path.join(__dirname, 'games');
});

ipcMain.handle('choose-games-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar carpeta de juegos',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths.length) return null;
  const chosen = result.filePaths[0];
  setGamesDir(chosen);
  return chosen;
});

ipcMain.handle('kill-game', async () => {
  return killCurrentGame()
});

ipcMain.handle('minimize-window', async () => {
  if (mainWindow) mainWindow.minimize()
});

ipcMain.handle('focus-game', async () => {
  const { exec } = require('child_process')
  exec(`powershell -command "(New-Object -ComObject WScript.Shell).AppActivate('mednafen')"`)
  exec(`powershell -command "(New-Object -ComObject WScript.Shell).AppActivate('retroarch')"`)
  return true
});

ipcMain.handle('start-netplay', async (event, params) => {
  if (!params || typeof params !== 'object') return { success: false, error: 'Params inválidos' }
  const { mode, ip, port, romPath } = params
  if (!['host', 'client'].includes(mode)) return { success: false, error: 'Mode inválido' }
  if (typeof romPath !== 'string' || romPath.includes('..')) return { success: false, error: 'romPath inválido' }
  if (mode === 'client') {
    if (typeof ip !== 'string' || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return { success: false, error: 'IP inválida' }
    if (typeof port !== 'string' && typeof port !== 'number') return { success: false, error: 'Port inválido' }
  }
  return startNetplay(params)
});