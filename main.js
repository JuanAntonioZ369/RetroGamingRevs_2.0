const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { getNickName } = require('./status');

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

  mainWindow.loadFile('Guia/mainLobby.html');
}

// ─── Detectar en qué página estamos ───
function getPageName(url) {
  if (url.includes('mainLobby')) return 'mainLobby';
  if (url.includes('gameModeSelection')) return 'gameModeSelection';
  if (url.includes('MultiplayerLobby')) return 'MultiplayerLobby';
  return null;
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

  mainWindow.webContents.on('dom-ready', () => {
    const url = mainWindow.webContents.getURL();
    const page = getPageName(url);

    // Enviar lista de juegos solo en mainLobby
    if (page === 'mainLobby') {
      const games = getGamesList();
      mainWindow.webContents.send('games-list', games);
    }
  });

  mainWindow.on('closed', () => {});
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('start-netplay', async (event, params) => {
  return startNetplay(params);
});