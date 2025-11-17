import { FolderTree, Upload, Download } from 'lucide-react';

export default function SFTP() {
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          SFTP File Manager
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Dual-pane file browser for remote and local files
        </p>
      </div>

      <div className="flex-1 card">
        <div className="flex items-center justify-center h-full text-center">
          <div>
            <FolderTree className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">SFTP File Manager</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Connect to a server to browse and manage files
            </p>
            <div className="flex gap-4 justify-center">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Upload className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                <p className="text-sm">Upload Files</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Download className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                <p className="text-sm">Download Files</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

