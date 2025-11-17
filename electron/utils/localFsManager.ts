import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LocalFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
}

export function getHomeDir(): string {
  return app.getPath('home');
}

export async function listLocal(dirPath: string): Promise<LocalFileEntry[]> {
  try {
    // Normalize path for cross-platform compatibility (Windows/Linux/Mac)
    const normalizedPath = path.normalize(dirPath);
    
    // Check if path exists
    try {
      await fs.access(normalizedPath);
    } catch {
      throw new Error(`Directory does not exist: ${normalizedPath}`);
    }

    const entries = await fs.readdir(normalizedPath, { withFileTypes: true });
    const fileEntries: LocalFileEntry[] = [];

    for (const entry of entries) {
      const fullPath = path.join(normalizedPath, entry.name);
      
      try {
        const stats = await fs.stat(fullPath);
        fileEntries.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime.getTime(),
        });
      } catch (error) {
        // Skip entries that can't be accessed (permissions, symlinks, etc.)
        console.warn(`Failed to stat ${fullPath}:`, error);
      }
    }

    // Sort: directories first, then by name (case-insensitive for better UX)
    fileEntries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    return fileEntries;
  } catch (error: any) {
    throw new Error(`Failed to list directory: ${error.message}`);
  }
}

