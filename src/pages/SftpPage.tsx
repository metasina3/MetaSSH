import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, File, FolderPlus, Edit2, Trash2, 
  Loader, AlertCircle, Upload, Download, Server as ServerIcon
} from 'lucide-react';
import { Server } from '../types/server';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';

// Helper function for cross-platform path handling
function getParentPath(currentPath: string, homeDir: string): string {
  // Simple path manipulation that works on both Windows and Linux
  const normalized = currentPath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(p => p);
  
  if (parts.length === 0) {
    return homeDir;
  }
  
  // Remove last part
  parts.pop();
  
  if (parts.length === 0) {
    // If we're at root, allow going to parent (for Windows: C:\, for Linux: /)
    if (currentPath.match(/^[A-Z]:/i)) {
      // Windows: return drive root (C:\)
      return currentPath.substring(0, 2) + '\\';
    } else if (currentPath.startsWith('/')) {
      // Linux: return root
      return '/';
    }
    // If we're at home, allow going to parent
    return homeDir.split(/[/\\]/).slice(0, -1).join(currentPath.includes('\\') ? '\\' : '/') || (currentPath.match(/^[A-Z]:/i) ? currentPath.substring(0, 2) + '\\' : '/');
  }
  
  // Reconstruct path
  // Check if original path was Windows absolute (C:/)
  if (currentPath.match(/^[A-Z]:/i)) {
    const drive = currentPath.substring(0, 2);
    return drive + '\\' + parts.join('\\');
  } else {
    return '/' + parts.join('/');
  }
}

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified?: number;
}

export default function SftpPage() {
  const navigate = useNavigate();
  
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local filesystem
  const [homeDir, setHomeDir] = useState<string>('');
  const [localPath, setLocalPath] = useState<string>('');
  const [localFiles, setLocalFiles] = useState<FileEntry[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState<FileEntry | null>(null);

  // Remote filesystem
  const [remotePath, setRemotePath] = useState<string>('');
  const [remoteFiles, setRemoteFiles] = useState<FileEntry[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [selectedRemote, setSelectedRemote] = useState<FileEntry | null>(null);

  // Load servers on mount
  useEffect(() => {
    const loadServers = async () => {
      try {
        if (window.electronAPI?.servers) {
          const data = await window.electronAPI.servers.list();
          setServers(data || []);
        }
      } catch (err: any) {
        console.error('Failed to load servers:', err);
      }
    };
    loadServers();

    // Get home directory
    const initHomeDir = async () => {
      try {
        const homeDirPath = await window.electronAPI.localfs.getHomeDir();
        setHomeDir(homeDirPath);
        setLocalPath(homeDirPath);
        await loadLocalFiles(homeDirPath);
      } catch (err: any) {
        console.error('Failed to get home directory:', err);
      }
    };
    initHomeDir();
  }, []);

  // Connect to server when selected
  useEffect(() => {
    if (!selectedServerId) {
      // Clear session if no server selected
      if (sessionId && window.electronAPI?.sftp) {
        try {
          window.electronAPI.sftp.close(sessionId);
        } catch (e) {
          // Ignore errors when closing
        }
      }
      setSessionId(null);
      setRemotePath('');
      setRemoteFiles([]);
      return;
    }

    const connect = async () => {
      try {
        setLoading(true);
        setError(null);

        // Close existing session if any
        if (sessionId && window.electronAPI?.sftp) {
          try {
            window.electronAPI.sftp.close(sessionId);
          } catch (e) {
            // Ignore errors when closing
          }
        }

        // Create SFTP session
        const { sessionId: newSessionId, initialRemotePath } = await window.electronAPI.sftp.createSession(selectedServerId);
        console.log('SFTP session created:', newSessionId, 'initial path:', initialRemotePath);
        setSessionId(newSessionId);
        setRemotePath(initialRemotePath);
        
        // Wait a bit before loading files to ensure session is ready
        setTimeout(async () => {
          try {
            // Use the stored sessionId, not the one from closure
            const currentSessionId = newSessionId;
            if (currentSessionId) {
              const files = await window.electronAPI.sftp.list(currentSessionId, initialRemotePath);
              setRemoteFiles(files);
              setError(null);
            }
          } catch (err: any) {
            console.error('Failed to load initial remote files:', err);
            setError(err.message || 'Failed to load remote files');
            setRemoteFiles([]);
          }
        }, 500);
      } catch (err: any) {
        console.error('Failed to connect:', err);
        setError(err.message || 'Failed to connect to server');
        setSessionId(null);
      } finally {
        setLoading(false);
      }
    };

    connect();

    // Don't cleanup on unmount - keep session alive when navigating away
  }, [selectedServerId]);

  const loadLocalFiles = async (path: string) => {
    try {
      setLocalLoading(true);
      const files = await window.electronAPI.localfs.list(path);
      setLocalFiles(files);
    } catch (err: any) {
      console.error('Failed to load local files:', err);
      alert(`Failed to load local files: ${err.message}`);
    } finally {
      setLocalLoading(false);
    }
  };

  const loadRemoteFiles = async (path: string) => {
    const currentSessionId = sessionId;
    if (!currentSessionId) {
      console.warn('No session ID available for loading remote files');
      return;
    }
    
    try {
      setRemoteLoading(true);
      console.log('Loading remote files with sessionId:', currentSessionId, 'path:', path);
      const files = await window.electronAPI.sftp.list(currentSessionId, path);
      setRemoteFiles(files);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load remote files:', err);
      setError(err.message || 'Failed to load remote files');
      setRemoteFiles([]);
    } finally {
      setRemoteLoading(false);
    }
  };

  const handleLocalClick = (file: FileEntry) => {
    if (file.isDirectory) {
      setLocalPath(file.path);
      loadLocalFiles(file.path);
      setSelectedLocal(null);
    } else {
      setSelectedLocal(file);
    }
  };

  const handleRemoteClick = (file: FileEntry) => {
    if (file.isDirectory) {
      setRemotePath(file.path);
      loadRemoteFiles(file.path);
      setSelectedRemote(null);
    } else {
      setSelectedRemote(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedLocal || !sessionId || selectedLocal.isDirectory) {
      alert('Please select a file to upload');
      return;
    }

    try {
      const remoteFilePath = remotePath === '/' 
        ? `/${selectedLocal.name}` 
        : `${remotePath}/${selectedLocal.name}`;
      
      await window.electronAPI.sftp.upload(sessionId, selectedLocal.path, remoteFilePath);
      await loadRemoteFiles(remotePath);
      setSelectedLocal(null);
      alert('File uploaded successfully');
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(`Upload failed: ${err.message}`);
    }
  };

  const handleDownload = async () => {
    if (!selectedRemote || !sessionId || selectedRemote.isDirectory) {
      alert('Please select a file to download');
      return;
    }

    try {
      const localFilePath = `${localPath}/${selectedRemote.name}`;
      await window.electronAPI.sftp.download(sessionId, selectedRemote.path, localFilePath);
      await loadLocalFiles(localPath);
      setSelectedRemote(null);
      alert('File downloaded successfully');
    } catch (err: any) {
      console.error('Download failed:', err);
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleNewFolder = async () => {
    if (!sessionId) return;

    const folderName = prompt('Enter folder name:');
    if (!folderName || !folderName.trim()) return;

    try {
      const newFolderPath = remotePath === '/' 
        ? `/${folderName.trim()}` 
        : `${remotePath}/${folderName.trim()}`;
      
      await window.electronAPI.sftp.mkdir(sessionId, newFolderPath);
      await loadRemoteFiles(remotePath);
      alert('Folder created successfully');
    } catch (err: any) {
      console.error('Failed to create folder:', err);
      alert(`Failed to create folder: ${err.message}`);
    }
  };

  const handleRename = async () => {
    if (!selectedRemote || !sessionId) return;

    const newName = prompt('Enter new name:', selectedRemote.name);
    if (!newName || !newName.trim() || newName === selectedRemote.name) return;

    try {
      const newPath = remotePath === '/' 
        ? `/${newName.trim()}` 
        : `${remotePath}/${newName.trim()}`;
      
      await window.electronAPI.sftp.rename(sessionId, selectedRemote.path, newPath);
      await loadRemoteFiles(remotePath);
      setSelectedRemote(null);
      alert('Renamed successfully');
    } catch (err: any) {
      console.error('Rename failed:', err);
      alert(`Rename failed: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedRemote || !sessionId) return;

    const confirmMessage = selectedRemote.isDirectory 
      ? `Are you sure you want to delete the folder "${selectedRemote.name}"?`
      : `Are you sure you want to delete the file "${selectedRemote.name}"?`;
    
    if (!confirm(confirmMessage)) return;

    try {
      await window.electronAPI.sftp.delete(sessionId, selectedRemote.path);
      await loadRemoteFiles(remotePath);
      setSelectedRemote(null);
      alert('Deleted successfully');
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert(`Delete failed: ${err.message}`);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <PageHeader
        title="SFTP File Manager"
        description="Transfer files between local and remote servers"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ServerIcon className="w-4 h-4 text-slate-400" />
              <select
                value={selectedServerId || ''}
                onChange={(e) => setSelectedServerId(e.target.value || null)}
                className="input text-sm w-64"
                disabled={loading}
              >
                <option value="">Select a server...</option>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name || server.host} ({server.host}:{server.port})
                  </option>
                ))}
              </select>
            </div>
            {loading && (
              <Loader className="w-5 h-5 animate-spin text-cyan-400" />
            )}
            {error && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            {sessionId && (
              <>
                <button
                  onClick={handleNewFolder}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <FolderPlus className="w-4 h-4" />
                  New Folder
                </button>
                {selectedRemote && (
                  <>
                    <button
                      onClick={handleRename}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Rename
                    </button>
                    <button
                      onClick={handleDelete}
                      className="btn btn-danger flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Action Buttons */}
      {sessionId && (
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={handleUpload}
            disabled={!selectedLocal || selectedLocal.isDirectory}
            className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Upload (Local → Remote)
          </button>
          <button
            onClick={handleDownload}
            disabled={!selectedRemote || selectedRemote.isDirectory}
            className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download (Remote → Local)
          </button>
        </div>
      )}

      {/* Dual Pane */}
      <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
        {/* Local Panel */}
        <Card className="flex flex-col p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/50">
            <div className="flex items-center gap-2 mb-1">
              <Folder className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-sm text-slate-100">Local Filesystem</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 truncate">
              {localPath}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {localLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-400">Name</th>
                    <th className="text-left p-3 font-semibold text-slate-400">Size</th>
                    <th className="text-left p-3 font-semibold text-slate-400">Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {localPath && (
                    <tr
                      onClick={async () => {
                        const parentPath = getParentPath(localPath, homeDir);
                        setLocalPath(parentPath);
                        await loadLocalFiles(parentPath);
                      }}
                      className="cursor-pointer hover:bg-slate-800/60 transition-colors"
                    >
                      <td colSpan={3} className="p-3">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-slate-500" />
                          <span className="text-slate-400">..</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {localFiles.map((file) => (
                    <tr
                      key={file.path}
                      onClick={() => handleLocalClick(file)}
                      className={`cursor-pointer hover:bg-slate-800/60 transition-colors ${
                        selectedLocal?.path === file.path ? 'bg-cyan-500/10' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {file.isDirectory ? (
                            <Folder className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <File className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="text-slate-200">{file.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-300">{file.isDirectory ? '-' : formatSize(file.size)}</td>
                      <td className="p-3 text-slate-400">{formatDate(file.modified)}</td>
                    </tr>
                  ))}
                  {localFiles.length === 0 && !localLoading && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-500">
                        No files
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Remote Panel */}
        <Card className="flex flex-col p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/50">
            <div className="flex items-center gap-2 mb-1">
              <Folder className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-sm text-slate-100">Remote Filesystem</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 truncate">
              {sessionId ? remotePath : 'Select a server to connect'}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {!sessionId ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500">
                  <ServerIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Please select a server from the dropdown above</p>
                </div>
              </div>
            ) : remoteLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-400">Name</th>
                    <th className="text-left p-3 font-semibold text-slate-400">Size</th>
                    <th className="text-left p-3 font-semibold text-slate-400">Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {remotePath && remotePath !== '/' && (
                    <tr
                      onClick={async () => {
                        const parts = remotePath.split('/').filter(p => p);
                        parts.pop();
                        const parentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
                        setRemotePath(parentPath);
                        await loadRemoteFiles(parentPath);
                      }}
                      className="cursor-pointer hover:bg-slate-800/60 transition-colors"
                    >
                      <td colSpan={3} className="p-3">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-slate-500" />
                          <span className="text-slate-400">..</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {remoteFiles.map((file) => (
                    <tr
                      key={file.path}
                      onClick={() => handleRemoteClick(file)}
                      className={`cursor-pointer hover:bg-slate-800/60 transition-colors ${
                        selectedRemote?.path === file.path ? 'bg-green-500/10' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {file.isDirectory ? (
                            <Folder className="w-4 h-4 text-green-400" />
                          ) : (
                            <File className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="text-slate-200">{file.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-300">{file.isDirectory ? '-' : formatSize(file.size)}</td>
                      <td className="p-3 text-slate-400">{formatDate(file.modified)}</td>
                    </tr>
                  ))}
                  {remoteFiles.length === 0 && !remoteLoading && sessionId && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-500">
                        No files
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
