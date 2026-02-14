import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, FileText, ClipboardList, Target,
  TrendingUp, Building2, Phone, LogOut, Menu, X, Shield,
  ChevronDown, CheckSquare
} from 'lucide-react';
import QuickSearch from '../common/QuickSearch';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/service-board', label: 'Service Board', icon: ClipboardList },
  { path: '/accounts', label: 'Accounts', icon: Users },
  { path: '/policies', label: 'Policies', icon: FileText },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/pipeline', label: 'Pipeline', icon: Target },
  { path: '/sales-log', label: 'Sales Log', icon: TrendingUp },
  { path: '/carriers', label: 'Carriers', icon: Building2 },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sentinel-800 text-white transform transition-transform duration-200
        lg:translate-x-0 lg:static lg:flex lg:flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sentinel-700">
          <Shield className="w-8 h-8 text-sentinel-300" />
          <div>
            <h1 className="font-bold text-lg leading-tight">Sentinel</h1>
            <p className="text-xs text-sentinel-400">Insurance Platform</p>
          </div>
        </div>

        {/* Quick search */}
        <div className="px-3 py-2">
          <QuickSearch />
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-sentinel-700 text-white'
                    : 'text-sentinel-300 hover:bg-sentinel-700/50 hover:text-white'}
                `}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-sentinel-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-sentinel-400 truncate">{user?.role}</p>
            </div>
            <button onClick={logout} className="p-2 text-sentinel-400 hover:text-white rounded-lg hover:bg-sentinel-700" title="Log out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-sentinel-500" />
            <span className="font-semibold text-sentinel-800">Sentinel</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
