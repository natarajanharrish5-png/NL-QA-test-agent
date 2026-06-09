import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  BarChart3, 
  Play, 
  CheckCircle, 
  XCircle, 
  History, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface RunItem {
  id: string;
  title: string;
  status: 'Pending' | 'Running' | 'Passed' | 'Failed';
  started_at: string;
  execution_time?: number;
  final_result?: 'Passed' | 'Failed';
}

interface Stats {
  passRate: number;
  totalRuns: number;
  averageExecutionTime: number;
  activeTests: number;
}

interface DashboardProps {
  onNavigateToCreate: () => void;
  onSelectRun: (runId: string) => void;
  userToken: string;
}

export default function Dashboard({ onNavigateToCreate, onSelectRun, userToken }: DashboardProps) {
  const [history, setHistory] = useState<RunItem[]>([]);
  const [stats, setStats] = useState<Stats>({ passRate: 0, totalRuns: 0, averageExecutionTime: 0, activeTests: 0 });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch Execution History which compiles metrics dynamically
      const res = await fetch('/api/execution/history', {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const data = await res.json();
      setHistory(data.slice(0, 5)); // show latest 5 runs
      
      // Calculate inline stats to assert precision
      if (data.length > 0) {
        const total = data.length;
        const passed = data.filter((r: any) => r.final_result === 'Passed' || r.status === 'Passed').length;
        const passRate = Math.round((passed / total) * 100);
        
        const completed = data.filter((r: any) => r.execution_time !== undefined);
        const sumTime = completed.reduce((sum: number, r: any) => sum + (r.execution_time || 0), 0);
        const avg = completed.length > 0 ? Math.round(sumTime / completed.length) : 0;
        
        const active = data.filter((r: any) => r.status === 'Running' || r.status === 'Pending').length;

        setStats({ passRate, totalRuns: total, averageExecutionTime: avg, activeTests: active });
      } else {
        setStats({ passRate: 0, totalRuns: 0, averageExecutionTime: 0, activeTests: 0 });
      }
    } catch (e) {
      console.error('Failed to load dashboard statistics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userToken]);

  return (
    <div id="dashboard-view" className="p-8 pb-16 space-y-8 text-[#F8FAFC]">
      
      {/* HEADER WITH CTA HERO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QA Automation Suite</h1>
          <p className="text-sm text-slate-400 mt-1">Configure &amp; analyze direct AI browser tests in standard English.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchDashboardData}
            title="Reload statistics and tests"
            className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateToCreate}
            className="bg-[#6366F1] hover:bg-indigo-600 font-semibold text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer text-white"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Create New Test</span>
          </button>
        </div>
      </div>

      {/* QUICK STATISTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Passer rate */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Pass Rate</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><ShieldCheck className="w-4 h-4" /></span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-sans tracking-tight">{stats.passRate}%</span>
            <span className="text-xs text-slate-500 font-mono">threshold met</span>
          </div>
        </div>

        {/* Total runs */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Runs</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400"><History className="w-4 h-4" /></span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-sans tracking-tight">{stats.totalRuns}</span>
            <span className="text-xs text-slate-500 font-mono">executions saved</span>
          </div>
        </div>

        {/* Avg duration */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Duration</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400"><Clock className="w-4 h-4" /></span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-sans tracking-tight">{stats.averageExecutionTime}s</span>
            <span className="text-xs text-slate-500 font-mono">per session automation</span>
          </div>
        </div>

        {/* Active execution runs */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Tests</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400"><BarChart3 className="w-4 h-4" /></span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-sans tracking-tight">{stats.activeTests}</span>
            <span className="text-xs text-slate-500 font-mono">running background daemon</span>
          </div>
        </div>

      </div>

      {/* RECENT EXECUTIONS OR ENTRY MOCK HERO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Test Run List */}
        <div className="lg:col-span-2 bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-850">
            <h3 className="text-sm font-bold tracking-tight uppercase text-slate-400">Recent Test Execution History</h3>
            <button 
              onClick={onNavigateToCreate}
              className="text-xs text-[#6366F1] hover:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>See All runs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <span className="animate-pulse">Loading dashboard records...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-14 text-center rounded-lg bg-[#0F172A]/40 border border-slate-800 border-dashed p-6">
              <Play className="w-10 h-10 text-indigo-400/40 mx-auto mb-3" />
              <p className="text-sm text-slate-300 font-semibold">No tests executed yet</p>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">Create and compile a natural language instruction to launch your first automated cloud-browser sandbox.</p>
              <button
                onClick={onNavigateToCreate}
                className="mt-4 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 font-semibold text-xs border border-indigo-500/30 rounded-lg cursor-pointer"
              >
                Launch Test Wizard
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((run) => (
                <div
                  key={run.id}
                  onClick={() => onSelectRun(run.id)}
                  className="p-4 bg-[#0F172A] border border-slate-800 hover:border-indigo-500/30 rounded-lg flex items-center justify-between gap-4 cursor-pointer transition-all duration-150 transform hover:-translate-y-[1px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{run.title}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-1">
                      <span>id: {run.id}</span>
                      <span>•</span>
                      <span>{new Date(run.started_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-mono font-semibold text-slate-300">{run.execution_time ? `${run.execution_time}s` : '---'}</p>
                      <p className="text-[10px] text-slate-500">duration</p>
                    </div>

                    <div className="flex items-center">
                      {run.status === 'Passed' || run.final_result === 'Passed' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Passed</span>
                        </span>
                      ) : run.status === 'Failed' || run.final_result === 'Failed' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-500/10 border border-red-500/30 text-red-400">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      ) : run.status === 'Running' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 border border-blue-500/30 text-blue-400 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                          <span>Running</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-500/10 border border-slate-550 text-slate-400">
                          <span>Pending</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Promo Bento Box panel */}
        <div className="bg-gradient-to-br from-[#1E293B] to-[#121A2C] border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
          
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
            <Sparkles className="w-48 h-48 text-indigo-400" />
          </div>

          <div>
            <div className="p-2 w-fit rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">AI Planning Sandbox</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Power by Google Gemini. Instantly convert high-level English instructions like <span className="text-indigo-300 font-mono italic">"add 2 items, checkout, verify success"</span> into step-by-step CSS action plans before launching.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/80">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">Mock application ready</h4>
            <div className="p-3 rounded-lg bg-[#0F172A] border border-slate-850 flex items-center gap-3">
              <span className="text-base">🛍️</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate truncate">FutureGadgets Mock Shop</p>
                <p className="text-[10px] text-emerald-400 font-mono">https://demo.example.com</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
