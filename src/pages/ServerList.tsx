import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Server as ServerIcon, Play, AlertCircle, FolderTree, Search } from 'lucide-react';
import { Server, ServerInput } from '../types/server';
import ServerForm from '../components/ServerForm';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import IconButton from '../components/ui/IconButton';
import Badge from '../components/ui/Badge';

export default function ServerList() {
  const navigate = useNavigate();
  const [servers, setServers] = useState<Server[]>([]);
  const [filteredServers, setFilteredServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredServers(servers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredServers(
        servers.filter(
          (s) =>
            s.name?.toLowerCase().includes(query) ||
            s.host.toLowerCase().includes(query) ||
            s.username.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, servers]);

  const loadServers = async () => {
    try {
      setLoading(true);
      setError(null);
      if (window.electronAPI?.servers) {
        const data = await window.electronAPI.servers.list();
        setServers(data || []);
        setFilteredServers(data || []);
      }
    } catch (err: any) {
      console.error('Failed to load servers:', err);
      setError(err.message || 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: ServerInput) => {
    try {
      if (window.electronAPI?.servers) {
        await window.electronAPI.servers.create(data);
        await loadServers();
        setShowModal(false);
        setEditingServer(null);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create server');
    }
  };

  const handleUpdate = async (data: ServerInput) => {
    if (!editingServer) return;
    
    try {
      if (window.electronAPI?.servers) {
        await window.electronAPI.servers.update(editingServer.id, data);
        await loadServers();
        setShowModal(false);
        setEditingServer(null);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update server');
    }
  };

  const handleEdit = (server: Server) => {
    setEditingServer(server);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const server = servers.find(s => s.id === id);
    const serverName = server?.name || 'this server';
    
    if (!confirm(`Are you sure you want to delete "${serverName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      if (window.electronAPI?.servers) {
        await window.electronAPI.servers.delete(id);
        await loadServers();
      }
    } catch (err: any) {
      alert(`Failed to delete server: ${err.message || 'Unknown error'}`);
    }
  };

  const handleConnect = (server: Server) => {
    navigate('/terminals', { state: { serverId: server.id, serverName: server.name || server.host } });
  };

  const openAddModal = () => {
    setEditingServer(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingServer(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading servers...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Server List"
        description="Manage your SSH hosts and connection profiles."
        actions={
          <button
            onClick={openAddModal}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Server
          </button>
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Search/Filter Bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select className="input w-48">
          <option>All groups</option>
        </select>
      </div>

      {filteredServers.length === 0 ? (
        <Card className="text-center py-16">
          <ServerIcon className="w-16 h-16 mx-auto text-slate-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-100 mb-2">No servers yet</h3>
          <p className="text-sm text-slate-400 mb-6">
            Create your first host to start connecting with MetaSSH.
          </p>
          <button onClick={openAddModal} className="btn btn-primary">
            Add Server
          </button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Host
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Port
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Auth Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredServers.map((server) => (
                  <tr
                    key={server.id}
                    className="hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-100">
                        {server.host}
                      </div>
                      {server.name && server.name !== server.host && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {server.name}
                        </div>
                      )}
                      {server.notes && (
                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                          {server.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">
                        {server.port}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">
                        {server.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={server.authType === 'password' ? 'blue' : 'green'}>
                        {server.authType === 'password' ? 'Password' : 'Private Key'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          icon={Play}
                          onClick={() => handleConnect(server)}
                          title="Connect"
                          variant="primary"
                        />
                        <IconButton
                          icon={FolderTree}
                          onClick={() => navigate('/sftp')}
                          title="SFTP File Manager"
                          variant="primary"
                        />
                        <IconButton
                          icon={Edit}
                          onClick={() => handleEdit(server)}
                          title="Edit"
                        />
                        <IconButton
                          icon={Trash2}
                          onClick={() => handleDelete(server.id)}
                          title="Delete"
                          variant="danger"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-800">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-slate-100 mb-1">
                {editingServer ? 'Edit Server' : 'Add Server'}
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                {editingServer ? 'Update server connection details' : 'Create a new SSH server connection'}
              </p>
              <ServerForm
                server={editingServer}
                onSubmit={editingServer ? handleUpdate : handleCreate}
                onCancel={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
