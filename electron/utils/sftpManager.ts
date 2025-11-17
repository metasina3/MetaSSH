import { Client, SFTPWrapper, ConnectConfig } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';
import { Server } from '../types/server';
import { getServer } from './serverStore';

export interface SFTPSession {
  id: string;
  serverId: string;
  status: 'connecting' | 'ready' | 'error' | 'closed';
  client: Client;
  sftp?: SFTPWrapper;
  errorMessage?: string;
}

const sessions = new Map<string, SFTPSession>();

function generateSessionId(): string {
  return `sftp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function createSftpSession(serverId: string): Promise<{ sessionId: string; initialRemotePath: string }> {
  // Check if session already exists for this server
  for (const [id, session] of sessions.entries()) {
    if (session.serverId === serverId && (session.status === 'ready' || session.status === 'connecting')) {
      // Return existing session's current path or home
      if (session.status === 'ready' && session.sftp) {
        return new Promise((resolve) => {
          session.sftp!.realpath('~', (err, homePath) => {
            if (err || !homePath) {
              resolve({ sessionId: id, initialRemotePath: '/' });
            } else {
              resolve({ sessionId: id, initialRemotePath: homePath });
            }
          });
        });
      }
      return { sessionId: id, initialRemotePath: '~' };
    }
  }

  const server = await getServer(serverId);
  if (!server) {
    throw new Error(`Server with id ${serverId} not found`);
  }

  const sessionId = generateSessionId();
  const client = new Client();

  const session: SFTPSession = {
    id: sessionId,
    serverId,
    status: 'connecting',
    client,
  };

  sessions.set(sessionId, session);

  // Prepare connection config
  const config: ConnectConfig = {
    host: server.host,
    port: server.port,
    username: server.username,
    readyTimeout: 30000,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3,
  };

  // Handle authentication
  if (server.authType === 'password') {
    if (!server.password) {
      session.status = 'error';
      session.errorMessage = 'Password is required';
      throw new Error('Password is required');
    }
    config.password = server.password;
  } else if (server.authType === 'privateKey') {
    if (!server.privateKeyPath) {
      session.status = 'error';
      session.errorMessage = 'Private key path is required';
      throw new Error('Private key path is required');
    }

    try {
      const keyPath = path.resolve(server.privateKeyPath);
      if (!fs.existsSync(keyPath)) {
        session.status = 'error';
        session.errorMessage = `Private key file not found: ${keyPath}`;
        throw new Error(`Private key file not found: ${keyPath}`);
      }

      const privateKey = fs.readFileSync(keyPath, 'utf8');
      config.privateKey = privateKey;

      if (server.passphrase) {
        config.passphrase = server.passphrase;
      }
    } catch (error: any) {
      session.status = 'error';
      session.errorMessage = error.message || 'Failed to read private key';
      throw error;
    }
  }

  // Connect to server
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      session.status = 'error';
      session.errorMessage = 'Connection timeout';
      reject(new Error('Connection timeout'));
    }, 30000);

    client.on('ready', () => {
      client.sftp((err, sftp) => {
        clearTimeout(timeout);
        if (err) {
          session.status = 'error';
          session.errorMessage = err.message;
          reject(err);
          return;
        }

        session.sftp = sftp;
        session.status = 'ready';
        
        // Get initial remote path (home directory)
        // Use a small delay to ensure SFTP is fully ready
        setTimeout(() => {
          sftp.realpath('~', (err, homePath) => {
            if (err || !homePath) {
              // Try to get current directory as fallback
              sftp.realpath('.', (err2, currentPath) => {
                if (err2 || !currentPath) {
                  resolve({ sessionId, initialRemotePath: '/' });
                } else {
                  resolve({ sessionId, initialRemotePath: currentPath });
                }
              });
            } else {
              resolve({ sessionId, initialRemotePath: homePath });
            }
          });
        }, 100);
      });
    });

    client.on('error', (err: Error) => {
      clearTimeout(timeout);
      session.status = 'error';
      session.errorMessage = err.message;
      reject(err);
    });

    client.on('close', () => {
      session.status = 'closed';
      sessions.delete(sessionId);
    });

    try {
      client.connect(config);
    } catch (error: any) {
      clearTimeout(timeout);
      session.status = 'error';
      session.errorMessage = error.message || 'Failed to connect';
      reject(error);
    }
  });
}

export interface RemoteFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified?: number;
}

export async function listRemote(sessionId: string, remotePath: string): Promise<RemoteFileEntry[]> {
  const session = sessions.get(sessionId);
  if (!session) {
    console.error('Available sessions:', Array.from(sessions.keys()));
    console.error('Requested sessionId:', sessionId);
    throw new Error(`SFTP session ${sessionId} not found`);
  }

  if (session.status !== 'ready' || !session.sftp) {
    throw new Error(`SFTP session ${sessionId} is not ready (status: ${session.status})`);
  }

  return new Promise((resolve, reject) => {
    session.sftp!.readdir(remotePath, (err, list) => {
      if (err) {
        reject(new Error(`Failed to list directory: ${err.message}`));
        return;
      }

      const entries: RemoteFileEntry[] = list.map((item) => {
        const fullPath = remotePath === '/' ? `/${item.filename}` : `${remotePath}/${item.filename}`;
        return {
          name: item.filename,
          path: fullPath,
          isDirectory: item.longname?.startsWith('d') || false,
          size: item.attrs?.size || 0,
          modified: item.attrs?.mtime ? item.attrs.mtime * 1000 : undefined,
        };
      });

      resolve(entries);
    });
  });
}

export async function downloadFile(sessionId: string, remotePath: string, localPath: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'ready' || !session.sftp) {
    throw new Error(`SFTP session ${sessionId} is not ready`);
  }

  return new Promise((resolve, reject) => {
    session.sftp!.fastGet(remotePath, localPath, (err) => {
      if (err) {
        reject(new Error(`Download failed: ${err.message}`));
        return;
      }
      resolve();
    });
  });
}

export async function uploadFile(sessionId: string, localPath: string, remotePath: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'ready' || !session.sftp) {
    throw new Error(`SFTP session ${sessionId} is not ready`);
  }

  // Check if local file exists
  if (!fs.existsSync(localPath)) {
    throw new Error(`Local file not found: ${localPath}`);
  }

  return new Promise((resolve, reject) => {
    session.sftp!.fastPut(localPath, remotePath, (err) => {
      if (err) {
        reject(new Error(`Upload failed: ${err.message}`));
        return;
      }
      resolve();
    });
  });
}

export async function mkdirRemote(sessionId: string, path: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'ready' || !session.sftp) {
    throw new Error(`SFTP session ${sessionId} is not ready`);
  }

  return new Promise((resolve, reject) => {
    session.sftp!.mkdir(path, (err) => {
      if (err) {
        reject(new Error(`Failed to create directory: ${err.message}`));
        return;
      }
      resolve();
    });
  });
}

export async function renameRemote(sessionId: string, oldPath: string, newPath: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'ready' || !session.sftp) {
    throw new Error(`SFTP session ${sessionId} is not ready`);
  }

  return new Promise((resolve, reject) => {
    session.sftp!.rename(oldPath, newPath, (err) => {
      if (err) {
        reject(new Error(`Failed to rename: ${err.message}`));
        return;
      }
      resolve();
    });
  });
}

export async function deleteRemote(sessionId: string, path: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'ready' || !session.sftp) {
    throw new Error(`SFTP session ${sessionId} is not ready`);
  }

  return new Promise((resolve, reject) => {
    // First check if it's a directory or file
    session.sftp!.stat(path, (err, stats) => {
      if (err) {
        reject(new Error(`Failed to check path: ${err.message}`));
        return;
      }

      if (stats.isDirectory()) {
        session.sftp!.rmdir(path, (err) => {
          if (err) {
            reject(new Error(`Failed to delete directory: ${err.message}`));
            return;
          }
          resolve();
        });
      } else {
        session.sftp!.unlink(path, (err) => {
          if (err) {
            reject(new Error(`Failed to delete file: ${err.message}`));
            return;
          }
          resolve();
        });
      }
    });
  });
}

export function closeSftpSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  if (session.client) {
    session.client.end();
  }

  sessions.delete(sessionId);
}

export function getSession(sessionId: string): SFTPSession | undefined {
  return sessions.get(sessionId);
}

