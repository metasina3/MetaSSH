import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Server, ServerInput } from '../types/server';

interface ServerFormProps {
  server?: Server | null;
  onSubmit: (data: ServerInput) => Promise<void>;
  onCancel: () => void;
}

export default function ServerForm({ server, onSubmit, onCancel }: ServerFormProps) {
  const [formData, setFormData] = useState<ServerInput>({
    name: '',
    host: '',
    port: 22,
    username: '',
    authType: 'password',
    password: '',
    privateKeyPath: '',
    passphrase: '',
    notes: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);

  useEffect(() => {
    if (server) {
      setFormData({
        name: server.name,
        host: server.host,
        port: server.port,
        username: server.username,
        authType: server.authType,
        password: '', // Don't show existing password
        privateKeyPath: server.privateKeyPath || '',
        passphrase: '', // Don't show existing passphrase
        notes: server.notes || '',
      });
    }
  }, [server]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.name.trim() || !formData.host.trim() || !formData.username.trim()) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.authType === 'password' && !server && !formData.password) {
        throw new Error('Password is required for password authentication');
      }

      if (formData.authType === 'privateKey' && !formData.privateKeyPath) {
        throw new Error('Private key path is required for key authentication');
      }

      // Prepare data (don't send empty password/passphrase if editing)
      const submitData: ServerInput = {
        name: formData.name.trim(),
        host: formData.host.trim(),
        port: formData.port,
        username: formData.username.trim(),
        authType: formData.authType,
        notes: formData.notes?.trim() || '',
      };

      if (formData.authType === 'password') {
        // Only include password if it's provided (new or changed)
        if (formData.password && formData.password.trim()) {
          submitData.password = formData.password;
        }
        // If editing and password is empty, don't include it - backend will keep existing
      } else {
        submitData.privateKeyPath = formData.privateKeyPath.trim();
        // Only include passphrase if it's provided (new or changed)
        if (formData.passphrase && formData.passphrase.trim()) {
          submitData.passphrase = formData.passphrase;
        }
        // If editing and passphrase is empty, don't include it - backend will keep existing
      }

      await onSubmit(submitData);
    } catch (err: any) {
      setError(err.message || 'Failed to save server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Connection Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Connection</h4>
        
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1.5">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            className="input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="My Server"
          />
          <p className="text-xs text-slate-500 mt-1">A friendly name for this server</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Host <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="input"
              value={formData.host}
              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              required
              placeholder="example.com"
            />
            <p className="text-xs text-slate-500 mt-1">Server hostname or IP address</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Port <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              className="input"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
              required
              min="1"
              max="65535"
            />
            <p className="text-xs text-slate-500 mt-1">SSH port (default: 22)</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1.5">
            Notes (optional)
          </label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes about this server..."
            rows={3}
          />
        </div>
      </div>

      {/* Authentication Section */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Authentication</h4>
        
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1.5">
            Username <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            className="input"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
            placeholder="root"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1.5">
            Authentication Type <span className="text-red-400">*</span>
          </label>
          <select
            className="input"
            value={formData.authType}
            onChange={(e) => setFormData({ ...formData, authType: e.target.value as 'password' | 'privateKey' })}
            required
          >
            <option value="password">Password</option>
            <option value="privateKey">Private Key</option>
          </select>
        </div>

        {formData.authType === 'password' ? (
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Password {!server && <span className="text-red-400">*</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={server ? 'Leave empty to keep current' : 'Enter password'}
                required={!server}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {server && (
              <p className="text-xs text-slate-500 mt-1">Leave empty to keep current password</p>
            )}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Private Key Path <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className="input"
                value={formData.privateKeyPath}
                onChange={(e) => setFormData({ ...formData, privateKeyPath: e.target.value })}
                required
                placeholder="/path/to/private/key"
              />
              <p className="text-xs text-slate-500 mt-1">Full path to your private key file</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Passphrase (optional)
              </label>
              <div className="relative">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  className="input pr-10"
                  value={formData.passphrase}
                  onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                  placeholder={server ? 'Leave empty to keep current' : 'Enter passphrase if key is encrypted'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {server && (
                <p className="text-xs text-slate-500 mt-1">Leave empty to keep current passphrase</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-6 border-t border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : server ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
