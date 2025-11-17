import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const SERVERS_FILE = path.join(DATA_DIR, 'servers.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getServers(): any[] {
  ensureDataDir();
  if (!fs.existsSync(SERVERS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(SERVERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading servers:', error);
    return [];
  }
}

export function saveServers(servers: any[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving servers:', error);
    throw error;
  }
}

export function getSettings(): any {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return {
      darkMode: false,
      fontSize: 14,
    };
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading settings:', error);
    return { darkMode: false, fontSize: 14 };
  }
}

export function saveSettings(settings: any): void {
  ensureDataDir();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

