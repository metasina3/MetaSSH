import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Terminal as TerminalIcon, AlertCircle, CheckCircle, Loader, Power, RotateCw } from 'lucide-react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';

interface TerminalTab {
  id: string;
  sessionId: string | null;
  serverId: string;
  serverName: string;
  status: 'connecting' | 'connected' | 'error' | 'disconnected';
  errorMessage?: string;
  xterm?: XTerm;
  fitAddon?: FitAddon;
}

export default function Terminals() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const hasOpenedTab = useRef<Set<string>>(new Set());

  // Check if we need to open a new tab from navigation
  useEffect(() => {
    const state = location.state as any;
    if (state?.serverId) {
      const key = `${state.serverId}-${state.serverName || ''}`;
      
      // Prevent double opening
      if (hasOpenedTab.current.has(key)) {
        const existingTab = tabs.find(t => t.serverId === state.serverId && t.status !== 'disconnected');
        if (existingTab) {
          setActiveTabId(existingTab.id);
        }
        return;
      }

      // Check if tab already exists for this server
      const existingTab = tabs.find(t => t.serverId === state.serverId && t.status !== 'disconnected');
      if (!existingTab) {
        hasOpenedTab.current.add(key);
        openNewTab(state.serverId, state.serverName || 'Unknown Server');
      } else {
        setActiveTabId(existingTab.id);
      }
    }
  }, [location.state]);

  const listenersRef = useRef<Map<string, { data: () => void; status: () => void }>>(new Map());

  const openNewTab = async (serverId: string, serverName: string) => {
    // Check if tab already exists
    const existingTab = tabs.find(t => t.serverId === serverId && t.status !== 'disconnected');
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newTab: TerminalTab = {
      id: tabId,
      sessionId: null,
      serverId,
      serverName,
      status: 'connecting',
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);

    // Connect to server
    try {
      if (!window.electronAPI?.ssh) {
        throw new Error('SSH API not available');
      }

      const { sessionId } = await window.electronAPI.ssh.createSession(serverId);
      
      setTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, sessionId, status: 'connecting' } : t
      ));

      // Setup listeners (only once per session)
      if (!listenersRef.current.has(sessionId)) {
        const unsubscribeData = window.electronAPI.ssh.onData((sid, data) => {
          if (sid === sessionId) {
            setTabs(prev => prev.map(t => {
              if (t.id === tabId && t.xterm) {
                t.xterm.write(data);
              }
              return t;
            }));
          }
        });

        const unsubscribeStatus = window.electronAPI.ssh.onStatus((sid, status, errorMessage) => {
          if (sid === sessionId) {
            setTabs(prev => prev.map(t => {
              if (t.id === tabId) {
                return { ...t, status: status as any, errorMessage };
              }
              return t;
            }));
          }
        });

        listenersRef.current.set(sessionId, {
          data: unsubscribeData,
          status: unsubscribeStatus,
        });
      }
    } catch (err: any) {
      setTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, status: 'error', errorMessage: err.message } : t
      ));
    }
  };

  const initializedTabs = useRef<Set<string>>(new Set());

  const initializeTerminal = (tabId: string, sessionId: string, container: HTMLDivElement) => {
    if (initializedTabs.current.has(tabId)) {
      return;
    }

    if (container.querySelector('.xterm')) {
      return;
    }

    initializedTabs.current.add(tabId);

    const timer = setTimeout(() => {
      const xterm = new XTerm({
        theme: {
          background: '#0a0e1a',
          foreground: '#e2e8f0',
          cursor: '#60a5fa',
          selection: '#1e3a8a',
        },
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        cursorBlink: true,
        cursorStyle: 'block',
      });

      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);
      xterm.open(container);
      fitAddon.fit();

      // Handle keyboard input (prevent double sending)
      let isWriting = false;
      const dataHandler = (data: string) => {
        if (isWriting) return;
        if (sessionId && window.electronAPI?.ssh) {
          isWriting = true;
          window.electronAPI.ssh.write(sessionId, data).catch(() => {}).finally(() => {
            setTimeout(() => { isWriting = false; }, 10);
          });
        }
      };
      xterm.onData(dataHandler);

      // Handle window resize
      const handleResize = () => {
        try {
          if (fitAddon && xterm.cols && xterm.rows) {
            fitAddon.fit();
            if (sessionId && window.electronAPI?.ssh) {
              window.electronAPI.ssh.resize(sessionId, xterm.cols, xterm.rows);
            }
          }
        } catch (error) {
          console.error('Error resizing terminal:', error);
        }
      };

      window.addEventListener('resize', handleResize);

      // Update tab with terminal instance
      setTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, xterm, fitAddon } : t
      ));

      // Store cleanup function
      (xterm as any).__cleanup = () => {
        window.removeEventListener('resize', handleResize);
        initializedTabs.current.delete(tabId);
        try {
          xterm.dispose();
        } catch (error) {
          console.error('Error disposing terminal:', error);
        }
      };
    }, 100);

    return () => {
      clearTimeout(timer);
      initializedTabs.current.delete(tabId);
    };
  };

  const closeTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.sessionId) {
      // Cleanup listeners
      const listeners = listenersRef.current.get(tab.sessionId);
      if (listeners) {
        listeners.data();
        listeners.status();
        listenersRef.current.delete(tab.sessionId);
      }
      
      // Close SSH session
      if (window.electronAPI?.ssh) {
        window.electronAPI.ssh.close(tab.sessionId);
      }
    }
    if (tab?.xterm && (tab.xterm as any).__cleanup) {
      (tab.xterm as any).__cleanup();
    }
    
    containerRefs.current.delete(tabId);
    initializedTabs.current.delete(tabId);
    
    // Remove from hasOpenedTab
    hasOpenedTab.current.delete(`${tab?.serverId}-${tab?.serverName || ''}`);
    
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId && newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      return newTabs;
    });
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Re-initialize terminal when active tab changes (if needed)
  useEffect(() => {
    if (activeTab && activeTab.sessionId && !activeTab.xterm && !initializedTabs.current.has(activeTab.id)) {
      const container = containerRefs.current.get(activeTab.id);
      if (container && !container.querySelector('.xterm')) {
        setTimeout(() => {
          initializeTerminal(activeTab.id, activeTab.sessionId!, container);
        }, 100);
      }
    }
  }, [activeTabId]);

  if (tabs.length === 0) {
    return (
      <div>
        <PageHeader
          title="Terminals"
          description="SSH terminal sessions for your servers"
        />
        <Card className="text-center py-16">
          <TerminalIcon className="w-16 h-16 mx-auto text-slate-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-100 mb-2">No Active Terminals</h3>
          <p className="text-sm text-slate-400 mb-6">
            Click "Connect" on a server from the Server List to open a terminal.
          </p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Go to Server List
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100 mb-1">Terminals</h1>
            <p className="text-sm text-slate-400">SSH terminal sessions</p>
          </div>
          {activeTab && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (activeTab.sessionId && window.electronAPI?.ssh) {
                    window.electronAPI.ssh.close(activeTab.sessionId);
                    closeTab(activeTab.id);
                  }
                }}
                className="btn btn-secondary flex items-center gap-2"
                title="Disconnect"
              >
                <Power className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-800">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl cursor-pointer transition-all min-w-0 ${
                activeTabId === tab.id
                  ? 'bg-slate-800 text-slate-100 border-t border-x border-slate-700'
                  : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {tab.status === 'connecting' && (
                  <Loader className="w-3.5 h-3.5 animate-spin flex-shrink-0 text-cyan-400" />
                )}
                {tab.status === 'connected' && (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                )}
                {tab.status === 'error' && (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                )}
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {tab.serverName}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="ml-2 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal Area */}
      <div className="flex-1 min-h-0">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <div
              key={tab.id}
              ref={(el) => {
                if (el) {
                  containerRefs.current.set(tab.id, el);
                  if (isActive && tab.sessionId && !tab.xterm && !initializedTabs.current.has(tab.id)) {
                    setTimeout(() => {
                      initializeTerminal(tab.id, tab.sessionId!, el);
                    }, 100);
                  }
                } else {
                  containerRefs.current.delete(tab.id);
                }
              }}
              className={`h-full ${isActive ? 'block' : 'hidden'}`}
            >
              {tab.status === 'error' && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-sm text-red-300">
                      {tab.errorMessage || 'Connection error'}
                    </p>
                  </div>
                </div>
              )}
              <div className="h-full bg-[#0a0e1a] rounded-xl border border-slate-800 overflow-hidden p-4">
                <div className="h-full w-full" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
