import { Client, ConnectConfig } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';
import { Server } from '../types/server';
import { getServer } from './serverStore';

export interface SSHSession {
  id: string;
  serverId: string;
  status: 'connecting' | 'connected' | 'error' | 'closed';
  client: Client;
  stream?: any;
  errorMessage?: string;
}

const sessions = new Map<string, SSHSession>();

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function createSession(serverId: string): Promise<{ sessionId: string }> {
  // Check if session already exists for this server
  for (const [id, session] of sessions.entries()) {
    if (session.serverId === serverId && (session.status === 'connected' || session.status === 'connecting')) {
      return { sessionId: id };
    }
  }

  const server = await getServer(serverId);
  if (!server) {
    throw new Error(`Server with id ${serverId} not found`);
  }

  const sessionId = generateSessionId();
  const client = new Client();

  const session: SSHSession = {
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
    readyTimeout: 40000, // 40 seconds - increased for slow connections
    keepaliveInterval: 10000, // Send keepalive every 10 seconds
    keepaliveCountMax: 3,
    // Additional options for better connection handling
    tryKeyboard: false,
    debug: (info: string) => {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SSH Debug] ${info}`);
      }
    },
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

  // Setup event handlers BEFORE connecting
  client.on('ready', () => {
    session.status = 'connected';
    console.log(`SSH session ${sessionId} connected to ${server.host}:${server.port}`);
  });

  client.on('error', (err: Error) => {
    session.status = 'error';
    session.errorMessage = err.message;
    console.error(`SSH session ${sessionId} error:`, err);
  });

  client.on('close', () => {
    session.status = 'closed';
    console.log(`SSH session ${sessionId} closed`);
    sessions.delete(sessionId);
  });

  // Start connection
  try {
    console.log(`Attempting to connect to ${server.host}:${server.port}...`);
    client.connect(config);
  } catch (error: any) {
    session.status = 'error';
    session.errorMessage = error.message || 'Failed to connect';
    console.error(`Failed to initiate connection:`, error);
    throw error;
  }

  return { sessionId };
}

export function writeToSession(sessionId: string, data: string): void {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  if (session.status !== 'connected' || !session.stream) {
    throw new Error(`Session ${sessionId} is not connected`);
  }

  session.stream.write(data);
}

export function resizeSession(sessionId: string, cols: number, rows: number): void {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  if (session.status !== 'connected' || !session.stream) {
    return; // Silently fail if not connected
  }

  session.stream.setWindow(rows, cols);
}

export function closeSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return; // Already closed or doesn't exist
  }

  if (session.client) {
    session.client.end();
  }

  sessions.delete(sessionId);
}

export function getSession(sessionId: string): SSHSession | undefined {
  return sessions.get(sessionId);
}

export function getAllSessions(): SSHSession[] {
  return Array.from(sessions.values());
}

