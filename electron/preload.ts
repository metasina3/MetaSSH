import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

  // Server management
  servers: {
    list: () => ipcRenderer.invoke('servers:list'),
    get: (id: string) => ipcRenderer.invoke('servers:get', id),
    create: (data: any) => ipcRenderer.invoke('servers:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('servers:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('servers:delete', id),
  },

  // SSH/Terminal
  ssh: {
    createSession: (serverId: string) => ipcRenderer.invoke('ssh:createSession', serverId),
    write: (sessionId: string, data: string) => ipcRenderer.invoke('ssh:write', sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) => 
      ipcRenderer.invoke('ssh:resize', sessionId, cols, rows),
    close: (sessionId: string) => ipcRenderer.invoke('ssh:close', sessionId),
    onData: (callback: (sessionId: string, data: string) => void) => {
      const handler = (_event: any, payload: { sessionId: string; data: string }) => {
        callback(payload.sessionId, payload.data);
      };
      ipcRenderer.on('ssh:data', handler);
      return () => {
        ipcRenderer.removeListener('ssh:data', handler);
      };
    },
    onStatus: (callback: (sessionId: string, status: string, errorMessage?: string) => void) => {
      const handler = (_event: any, payload: { sessionId: string; status: string; errorMessage?: string }) => {
        callback(payload.sessionId, payload.status, payload.errorMessage);
      };
      ipcRenderer.on('ssh:status', handler);
      return () => {
        ipcRenderer.removeListener('ssh:status', handler);
      };
    },
  },

  // SFTP
  sftp: {
    createSession: (serverId: string) => ipcRenderer.invoke('sftp:createSession', serverId),
    list: (sessionId: string, path: string) => ipcRenderer.invoke('sftp:list', sessionId, path),
    download: (sessionId: string, remotePath: string, localPath: string) => 
      ipcRenderer.invoke('sftp:download', sessionId, remotePath, localPath),
    upload: (sessionId: string, localPath: string, remotePath: string) => 
      ipcRenderer.invoke('sftp:upload', sessionId, localPath, remotePath),
    mkdir: (sessionId: string, path: string) => ipcRenderer.invoke('sftp:mkdir', sessionId, path),
    rename: (sessionId: string, oldPath: string, newPath: string) => 
      ipcRenderer.invoke('sftp:rename', sessionId, oldPath, newPath),
    delete: (sessionId: string, path: string) => ipcRenderer.invoke('sftp:delete', sessionId, path),
    close: (sessionId: string) => ipcRenderer.invoke('sftp:close', sessionId),
  },

  // Local filesystem
  localfs: {
    getHomeDir: () => ipcRenderer.invoke('localfs:getHomeDir'),
    list: (path: string) => ipcRenderer.invoke('localfs:list', path),
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
});

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      servers: {
        list: () => Promise<any[]>;
        get: (id: string) => Promise<any | null>;
        create: (data: any) => Promise<any>;
        update: (id: string, data: any) => Promise<any>;
        delete: (id: string) => Promise<void>;
      };
      ssh: {
        createSession: (serverId: string) => Promise<{ sessionId: string }>;
        write: (sessionId: string, data: string) => Promise<void>;
        resize: (sessionId: string, cols: number, rows: number) => Promise<void>;
        close: (sessionId: string) => Promise<void>;
        onData: (callback: (sessionId: string, data: string) => void) => () => void;
        onStatus: (callback: (sessionId: string, status: string, errorMessage?: string) => void) => () => void;
      };
      sftp: {
        createSession: (serverId: string) => Promise<{ sessionId: string; initialRemotePath: string }>;
        list: (sessionId: string, path: string) => Promise<any[]>;
        download: (sessionId: string, remotePath: string, localPath: string) => Promise<void>;
        upload: (sessionId: string, localPath: string, remotePath: string) => Promise<void>;
        mkdir: (sessionId: string, path: string) => Promise<void>;
        rename: (sessionId: string, oldPath: string, newPath: string) => Promise<void>;
        delete: (sessionId: string, path: string) => Promise<void>;
        close: (sessionId: string) => Promise<void>;
      };
      localfs: {
        getHomeDir: () => Promise<string>;
        list: (path: string) => Promise<any[]>;
      };
      getSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<void>;
    };
  }
}

