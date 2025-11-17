import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { Server, ServerInput } from '../types/server';
import { encrypt, decrypt } from './encryption';

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const SERVERS_FILE = path.join(DATA_DIR, 'servers.json');

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Read servers from file (raw, encrypted)
function readServersRaw(): Server[] {
  ensureDataDir();
  if (!fs.existsSync(SERVERS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(SERVERS_FILE, 'utf-8');
    return JSON.parse(data) as Server[];
  } catch (error) {
    console.error('Error reading servers:', error);
    return [];
  }
}

// Read servers from file (decrypted)
function readServers(): Server[] {
  const servers = readServersRaw();
  // Decrypt sensitive fields
  return servers.map(server => ({
    ...server,
    password: server.password ? decrypt(server.password) : undefined,
    passphrase: server.passphrase ? decrypt(server.passphrase) : undefined,
  }));
}

// Write servers to file
function writeServers(servers: Server[]): void {
  ensureDataDir();
  try {
    // Encrypt sensitive fields before saving (only if not already encrypted)
    // Encrypted format: hex:hex (IV:encrypted_data)
    const encryptedServers = servers.map(server => ({
      ...server,
      password: server.password 
        ? (server.password.includes(':') && server.password.split(':').length === 2 
            ? server.password // Already encrypted
            : encrypt(server.password)) // Need encryption
        : undefined,
      passphrase: server.passphrase
        ? (server.passphrase.includes(':') && server.passphrase.split(':').length === 2
            ? server.passphrase // Already encrypted
            : encrypt(server.passphrase)) // Need encryption
        : undefined,
    }));
    fs.writeFileSync(SERVERS_FILE, JSON.stringify(encryptedServers, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving servers:', error);
    throw error;
  }
}

// Generate UUID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get all servers
export async function getServers(): Promise<Server[]> {
  return readServers();
}

// Get a single server by ID
export async function getServer(id: string): Promise<Server | undefined> {
  const servers = readServers();
  return servers.find(s => s.id === id);
}

// Create a new server
export async function createServer(input: ServerInput): Promise<Server> {
  const servers = readServers();
  const now = new Date().toISOString();
  
  const newServer: Server = {
    id: generateId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  
  servers.push(newServer);
  writeServers(servers);
  return newServer;
}

// Update an existing server
export async function updateServer(id: string, partial: Partial<ServerInput>): Promise<Server> {
  // Read raw (encrypted) servers to preserve existing encrypted passwords
  const rawServers = readServersRaw();
  const index = rawServers.findIndex(s => s.id === id);
  
  if (index === -1) {
    throw new Error(`Server with id ${id} not found`);
  }
  
  const existingServerRaw = rawServers[index];
  
  // Prepare update data - preserve encrypted passwords if not changed
  const updateData: any = { ...partial };
  
  // Handle password: if not provided, keep existing encrypted password
  if (partial.authType === 'password' || existingServerRaw.authType === 'password') {
    if (!partial.password || partial.password.trim() === '') {
      // Keep existing encrypted password
      if (existingServerRaw.password) {
        updateData.password = existingServerRaw.password; // Already encrypted
      }
    }
    // If password is provided, it will be encrypted in writeServers
  } else if (partial.authType === 'privateKey') {
    // Switching to private key, remove password
    updateData.password = undefined;
  }
  
  // Handle passphrase: if not provided, keep existing encrypted passphrase
  if (partial.authType === 'privateKey' || existingServerRaw.authType === 'privateKey') {
    if (!partial.passphrase || partial.passphrase.trim() === '') {
      // Keep existing encrypted passphrase
      if (existingServerRaw.passphrase) {
        updateData.passphrase = existingServerRaw.passphrase; // Already encrypted
      }
    }
    // If passphrase is provided, it will be encrypted in writeServers
  } else if (partial.authType === 'password') {
    // Switching to password, remove passphrase
    updateData.passphrase = undefined;
  }
  
  // Merge updates
  const updatedServerRaw: Server = {
    ...existingServerRaw,
    ...updateData,
    updatedAt: new Date().toISOString(),
  };
  
  // Write back - writeServers will encrypt only if not already encrypted
  // We need to check: if password/passphrase contain ':' they're encrypted (format: iv:encrypted)
  const serversToWrite = rawServers.map((s, i) => {
    if (i === index) {
      return {
        ...updatedServerRaw,
        // Only encrypt if not already encrypted (encrypted format: hex:hex)
        password: updatedServerRaw.password 
          ? (updatedServerRaw.password.includes(':') ? updatedServerRaw.password : encrypt(updatedServerRaw.password))
          : undefined,
        passphrase: updatedServerRaw.passphrase
          ? (updatedServerRaw.passphrase.includes(':') ? updatedServerRaw.passphrase : encrypt(updatedServerRaw.passphrase))
          : undefined,
      };
    }
    return s;
  });
  
  writeServers(serversToWrite);
  
  // Return decrypted version for API
  const updatedServer = {
    ...updatedServerRaw,
    password: updatedServerRaw.password ? decrypt(updatedServerRaw.password) : undefined,
    passphrase: updatedServerRaw.passphrase ? decrypt(updatedServerRaw.passphrase) : undefined,
  };
  
  return updatedServer;
}

// Delete a server
export async function deleteServer(id: string): Promise<void> {
  const servers = readServersRaw(); // Use raw to preserve encryption format
  const filtered = servers.filter(s => s.id !== id);
  
  if (filtered.length === servers.length) {
    throw new Error(`Server with id ${id} not found`);
  }
  
  writeServers(filtered);
}

