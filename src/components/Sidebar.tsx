import React from 'react';
import { 
  Play, 
  History, 
  HelpCircle, 
  Settings as SettingsIcon, 
  LogOut, 
  LayoutDashboard, 
  Code2, 
  TrendingUp,
  ShieldAlert
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (sec: string) => void;
  user: { full_name: string; email: string };
  onLogout: () => void;
}

export default function Sidebar({ activeSection, setActiveSection, user, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create', label: 'Create New Test', icon: Code2 },
    { id: 'history', label: 'Test History', icon: History },
    { id: 'suggestions', label: 'AI Suggestions', icon: TrendingUp },
  ];

  return (
    <aside id="sidebar-container" className="w-64 bg-[#1E293B] border-r border-slate-800 flex flex-col justify-between select-none">
      <div className="flex flex-col">
        
        {/* Brand Container */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
            🤖
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white leading-none">QA Test Agent</h1>
            <span className="text-[10px] text-indigo-400 font-mono tracking-wider">NL BROWSER POC</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id || (item.id === 'create' && activeSection === 'execution');
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-left ${
                  isActive 
                    ? 'bg-indigo-600 font-semibold text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Session Profile and Logout */}
      <div className="p-4 border-t border-slate-800/80">
        
        {/* User Card */}
        <div className="mb-4 px-4 py-3 bg-[#0F172A] border border-slate-800/70 rounded-xl flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 text-xs shrink-0 select-none border border-indigo-500/10">
            {user.full_name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-100 truncate leading-none mb-0.5">{user.full_name}</p>
            <p className="text-[10px] text-slate-500 truncate leading-none">{user.email}</p>
          </div>
        </div>

        {/* Logout Trigger */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/15 transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Account Workspace</span>
        </button>
        
      </div>
    </aside>
  );
}
