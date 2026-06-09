import React from 'react';
import { User, Activity, CheckCircle, Database } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header id="header-container" className="h-16 bg-[#1E293B] border-b border-slate-800 flex items-center justify-between px-8 select-none">
      <div>
        <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
      </div>
      
      {/* Quick context info panels */}
      <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0F172A] border border-slate-800">
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono text-[10px]">LOCAL ENGINE ACTIVE</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0F172A] border border-slate-800">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-mono text-[10px] text-emerald-400">ONLINE</span>
        </div>
      </div>
    </header>
  );
}
