import { Link, useLocation } from 'react-router-dom';
import { Server, Terminal, FolderTree, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Server, label: 'Servers' },
    { path: '/terminals', icon: Terminal, label: 'Terminals' },
    { path: '/sftp', icon: FolderTree, label: 'SFTP' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#070B14] to-[#0D111C] text-slate-100">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-950/50 border-r border-slate-800 flex flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-slate-100 mb-0.5">
            MetaSSH
          </h1>
          <p className="text-xs text-slate-400">
            SSH/SFTP Client
          </p>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative ${
                      isActive
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-500 rounded-r-full" />
                    )}
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 text-center">
            v1.0.0
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
