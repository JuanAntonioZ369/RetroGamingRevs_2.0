const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { getNickName } = require('./status');
const { startNetplay } = require('./gameOnly');

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

  mainWindow.loadFile('html/mainLobby.html');
}

// ─── Detectar en qué página estamos ───
function getPageName(url) {
  if (url.includes('html/mainLobby')) return 'mainLobby';
  if (url.includes('html/gameModeSelection')) return 'gameModeSelection';
  if (url.includes('html/MultiplayerLobby')) return 'MultiplayerLobby';
  return null;
}

function getGamesList() {
  const gamesDir = path.join(__dirname, 'games');
  const folders = [];
  try {
    const topLevel = fs.readdirSync(gamesDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    topLevel.forEach(folderName => {
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
        folders.push({ name: folderName, games });
      }
    });
  } catch (err) {
    console.error('Error leyendo games:', err);
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
  });

  mainWindow.on('closed', () => {});
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('start-netplay', async (event, params) => {
  return startNetplay(params);
});