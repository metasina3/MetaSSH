import { Moon, Sun, Download, Upload, Database } from 'lucide-react';
import { useState, useEffect } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    // Load settings from storage
    const loadSettings = async () => {
      if (window.electronAPI) {
        try {
          const settings = await window.electronAPI.getSettings();
          if (settings) {
            setDarkMode(settings.darkMode || false);
            setFontSize(settings.fontSize || 14);
            // Apply dark mode
            if (settings.darkMode) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      }
    };
    loadSettings();
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save to settings
    if (window.electronAPI) {
      window.electronAPI.saveSettings({ darkMode: newMode, fontSize });
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure your MetaSSH preferences"
      />

      <div className="space-y-6 max-w-2xl">
        {/* Appearance */}
        <Card>
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Appearance</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? (
                  <Moon className="w-5 h-5 text-slate-400" />
                ) : (
                  <Sun className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <p className="font-medium text-slate-100">Dark Mode</p>
                  <p className="text-sm text-slate-400">
                    Toggle dark theme
                  </p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Terminal Font Size: {fontSize}px
              </label>
              <input
                type="range"
                min="10"
                max="24"
                value={fontSize}
                onChange={(e) => {
                  const size = parseInt(e.target.value);
                  setFontSize(size);
                  if (window.electronAPI) {
                    window.electronAPI.saveSettings({ darkMode, fontSize: size });
                  }
                }}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card>
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Data Management</h3>
          <div className="space-y-3">
            <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Export Configuration
            </button>
            <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
              <Upload className="w-5 h-5" />
              Import Configuration
            </button>
            <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
              <Database className="w-5 h-5" />
              Backup Data
            </button>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Security</h3>
          <div className="space-y-3">
            <div className="p-4 bg-cyan-500/20 border border-cyan-500/30 rounded-xl">
              <p className="text-sm text-cyan-300">
                🔒 All server credentials are encrypted using AES-256 encryption.
                Master password feature coming soon.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
