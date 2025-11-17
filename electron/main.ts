import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { getSettings, saveSettings } from './utils/storage';
import * as serverStore from './utils/serverStore';
import * as sshManager from './utils/sshSessionManager';
import * as sftpManager from './utils/sftpManager';
import * as localFsManager from './utils/localFsManager';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

// Development mode detection
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged || process.env.ELECTRON_IS_DEV === '1';

if (isDev) {
  console.log('🚀 Running in DEVELOPMENT mode');
  console.log('📦 App path:', app.getAppPath());
  console.log('📁 User data:', app.getPath('userData'));
}

function createWindow() {
  // Get preload path
  let preloadPath: string;
  if (isDev) {
    // In development, use compiled preload from dist-electron
    // __dirname will be dist-electron when running compiled code
    preloadPath = path.join(__dirname, 'preload.js');
    // Fallback: if __dirname doesn't point to dist-electron, use process.cwd
    if (!preloadPath.includes('dist-electron')) {
      preloadPath = path.join(process.cwd(), 'dist-electron', 'preload.js');
    }
  } else {
    // In production, preload is in dist-electron
    preloadPath = path.join(app.getAppPath(), 'dist-electron', 'preload.js');
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    backgroundColor: '#f9fafb',
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    console.log('Window ready and shown');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    // In dev mode, try to reload after a short delay if Vite server isn't ready
    if (isDev && errorCode === -106) {
      console.log('Vite server not ready yet, will retry...');
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      }, 2000);
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading');
  });

  // Enable hot reload in development
  if (isDev) {
    // Reload window when files change (handled by Vite HMR)
    mainWindow.webContents.on('did-frame-finish-load', () => {
      console.log('Frame finished loading - DevTools available');
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});

// Server Management IPC Handlers
ipcMain.handle('servers:list', async () => {
  try {
    return await serverStore.getServers();
  } catch (error) {
    console.error('Error listing servers:', error);
    throw error;
  }
});

ipcMain.handle('servers:get', async (_, id: string) => {
  try {
    return await serverStore.getServer(id);
  } catch (error) {
    console.error('Error getting server:', error);
    throw error;
  }
});

ipcMain.handle('servers:create', async (_, data) => {
  try {
    return await serverStore.createServer(data);
  } catch (error) {
    console.error('Error creating server:', error);
    throw error;
  }
});

ipcMain.handle('servers:update', async (_, id: string, data) => {
  try {
    return await serverStore.updateServer(id, data);
  } catch (error) {
    console.error('Error updating server:', error);
    throw error;
  }
});

ipcMain.handle('servers:delete', async (_, id: string) => {
  try {
    await serverStore.deleteServer(id);
  } catch (error) {
    console.error('Error deleting server:', error);
    throw error;
  }
});

// Settings
ipcMain.handle('settings:get', () => {
  return getSettings();
});

ipcMain.handle('settings:save', (_, settings) => {
  saveSettings(settings);
});

// SSH/Terminal IPC Handlers
ipcMain.handle('ssh:createSession', async (_, serverId: string) => {
  try {
    const { sessionId } = await sshManager.createSession(serverId);
    const session = sshManager.getSession(sessionId);
    
    if (!session) {
      throw new Error('Failed to create session');
    }

    // Wait for connection to be ready
    return new Promise((resolve, reject) => {
      const CONNECTION_TIMEOUT = 45000; // 45 seconds (longer than readyTimeout)
      let timeoutCleared = false;

      const timeout = setTimeout(() => {
        if (timeoutCleared) return;
        timeoutCleared = true;
        session.status = 'error';
        session.errorMessage = `Connection timeout after ${CONNECTION_TIMEOUT / 1000} seconds. Please check:\n- Server is reachable\n- Port is correct\n- Firewall settings\n- Network connection`;
        notifyStatus(sessionId, 'error', session.errorMessage);
        session.client.end();
        reject(new Error(session.errorMessage));
      }, CONNECTION_TIMEOUT);

      // Handle successful connection
      const onReady = () => {
        if (timeoutCleared) return;
        clearTimeout(timeout);
        timeoutCleared = true;
        
        console.log(`SSH connection ready for session ${sessionId}, creating shell...`);
        
        // Create shell
        session.client.shell((err: Error | undefined, stream: any) => {
          if (err) {
            session.status = 'error';
            session.errorMessage = `Failed to create shell: ${err.message}`;
            notifyStatus(sessionId, 'error', session.errorMessage);
            session.client.end();
            reject(new Error(session.errorMessage));
            return;
          }

          session.stream = stream;
          session.status = 'connected';
          notifyStatus(sessionId, 'connected');

          // Forward data to renderer
          stream.on('data', (data: Buffer) => {
            notifyData(sessionId, data.toString());
          });

          stream.stderr.on('data', (data: Buffer) => {
            notifyData(sessionId, data.toString());
          });

          stream.on('close', () => {
            session.status = 'closed';
            notifyStatus(sessionId, 'closed');
            sshManager.closeSession(sessionId);
          });

          console.log(`Shell created successfully for session ${sessionId}`);
          resolve({ sessionId });
        });
      };

      // Handle connection errors
      const onError = (err: Error) => {
        if (timeoutCleared) return;
        clearTimeout(timeout);
        timeoutCleared = true;
        session.status = 'error';
        session.errorMessage = err.message || 'Connection failed';
        notifyStatus(sessionId, 'error', session.errorMessage);
        console.error(`SSH connection error for session ${sessionId}:`, err);
        reject(new Error(session.errorMessage));
      };

      // Register event listeners
      session.client.once('ready', onReady);
      session.client.once('error', onError);
    });
  } catch (error: any) {
    console.error('Error creating SSH session:', error);
    throw error;
  }
});

ipcMain.handle('ssh:write', (_, sessionId: string, data: string) => {
  try {
    sshManager.writeToSession(sessionId, data);
  } catch (error: any) {
    console.error('Error writing to SSH session:', error);
    throw error;
  }
});

ipcMain.handle('ssh:resize', (_, sessionId: string, cols: number, rows: number) => {
  try {
    sshManager.resizeSession(sessionId, cols, rows);
  } catch (error: any) {
    console.error('Error resizing SSH session:', error);
    // Don't throw, just log
  }
});

ipcMain.handle('ssh:close', (_, sessionId: string) => {
  try {
    sshManager.closeSession(sessionId);
  } catch (error: any) {
    console.error('Error closing SSH session:', error);
  }
});

// Helper functions to notify renderer
function notifyData(sessionId: string, data: string) {
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach(window => {
    window.webContents.send('ssh:data', { sessionId, data });
  });
}

function notifyStatus(sessionId: string, status: string, errorMessage?: string) {
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach(window => {
    window.webContents.send('ssh:status', { sessionId, status, errorMessage });
  });
}

// SFTP IPC Handlers
ipcMain.handle('sftp:createSession', async (_, serverId: string) => {
  try {
    return await sftpManager.createSftpSession(serverId);
  } catch (error: any) {
    console.error('Error creating SFTP session:', error);
    throw error;
  }
});

ipcMain.handle('sftp:list', async (_, sessionId: string, remotePath: string) => {
  try {
    return await sftpManager.listRemote(sessionId, remotePath);
  } catch (error: any) {
    console.error('Error listing remote directory:', error);
    throw error;
  }
});

ipcMain.handle('sftp:download', async (_, sessionId: string, remotePath: string, localPath: string) => {
  try {
    await sftpManager.downloadFile(sessionId, remotePath, localPath);
  } catch (error: any) {
    console.error('Error downloading file:', error);
    throw error;
  }
});

ipcMain.handle('sftp:upload', async (_, sessionId: string, localPath: string, remotePath: string) => {
  try {
    await sftpManager.uploadFile(sessionId, localPath, remotePath);
  } catch (error: any) {
    console.error('Error uploading file:', error);
    throw error;
  }
});

ipcMain.handle('sftp:mkdir', async (_, sessionId: string, path: string) => {
  try {
    await sftpManager.mkdirRemote(sessionId, path);
  } catch (error: any) {
    console.error('Error creating remote directory:', error);
    throw error;
  }
});

ipcMain.handle('sftp:rename', async (_, sessionId: string, oldPath: string, newPath: string) => {
  try {
    await sftpManager.renameRemote(sessionId, oldPath, newPath);
  } catch (error: any) {
    console.error('Error renaming remote file:', error);
    throw error;
  }
});

ipcMain.handle('sftp:delete', async (_, sessionId: string, path: string) => {
  try {
    await sftpManager.deleteRemote(sessionId, path);
  } catch (error: any) {
    console.error('Error deleting remote file:', error);
    throw error;
  }
});

ipcMain.handle('sftp:close', async (_, sessionId: string) => {
  try {
    sftpManager.closeSftpSession(sessionId);
  } catch (error: any) {
    console.error('Error closing SFTP session:', error);
  }
});

// Local filesystem IPC Handlers
ipcMain.handle('localfs:getHomeDir', () => {
  try {
    return localFsManager.getHomeDir();
  } catch (error: any) {
    console.error('Error getting home directory:', error);
    throw error;
  }
});

ipcMain.handle('localfs:list', async (_, dirPath: string) => {
  try {
    return await localFsManager.listLocal(dirPath);
  } catch (error: any) {
    console.error('Error listing local directory:', error);
    throw error;
  }
});

