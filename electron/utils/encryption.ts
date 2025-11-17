import * as crypto from 'crypto';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const KEY_FILE = path.join(app.getPath('userData'), 'key.dat');

// Generate or load encryption key
function getEncryptionKey(): Buffer {
  if (fs.existsSync(KEY_FILE)) {
    return fs.readFileSync(KEY_FILE);
  }
  
  // Generate machine-bound key
  const machineId = os.hostname() + os.platform() + os.arch();
  const key = crypto.createHash('sha256').update(machineId).digest();
  fs.writeFileSync(KEY_FILE, key);
  return key;
}

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encrypted = parts.join(':');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

