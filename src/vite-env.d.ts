/// <reference types="vite/client" />
import { Server, ServerInput } from './types/server';

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      servers: {
        list: () => Promise<Server[]>;
        get: (id: string) => Promise<Server | null>;
        create: (data: ServerInput) => Promise<Server>;
        update: (id: string, data: Partial<ServerInput>) => Promise<Server>;
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

export {};
