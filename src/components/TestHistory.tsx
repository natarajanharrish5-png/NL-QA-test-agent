import React, { useState, useEffect } from 'react';
import { 
  Play, 
  History, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Eye, 
  Trash2,
  RefreshCw 
} from 'lucide-react';

interface RunRecord {
  id: string;
  title: string;
  status: 'Pending' | 'Running' | 'Passed' | 'Failed';
  started_at: string;
  execution_time?: number;
  final_result?: 'Passed' | 'Failed';
}

interface TestHistoryProps {
  userToken: string;
  onSelectRun: (runId: string) => void;
}

export default function TestHistory({ userToken, onSelectRun }: TestHistoryProps) {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/execution/history', {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const data = await res.json();
      setRuns(data);
    } catch (e) {
      console.error('Failed to load test runs history profiles:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userToken]);

  const handleClearHistory = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this test execution record?')) return;
    try {
      // Inline deletion endpoint simulation
      const res = await fetch(`/api/tests/${runId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      if (res.ok) {
        setRuns(prev => prev.filter(r => r.id !== runId));
      }
    } catch (err) {
      console.error('Failed to clear run object', err);
    }
  };

  const filteredRuns = runs.filter(run => 
    run.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    run.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="test-history-view" className="p-8 pb-16 space-y-8 text-[#F8FAFC]">
      
      {/* Header bar section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Test Run Ledger History</h1>
          <p className="text-sm text-slate-400 mt-1">Audit, inspect, and compare details of all executed test runs and automation suites.</p>
        </div>
        <button
          onClick={fetchHistory}
          className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Reload history table"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 flex items-center gap-3">
        <Search className="w-4.5 h-4.5 text-slate-500 ml-1 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter logs by test title, execution ID, or outcome details..."
          className="w-full bg-[#0F172A] border border-slate-800 focus:border-indigo-500/50 rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
        />
      </div>

      {/* LEDGER DATA TABLE */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl shadow-sm overflow-hidden select-none">
        {loading ? (
          <div className="py-20 text-center text-slate-500 font-medium">
            <span className="animate-pulse">Retrieving test audit record ledger...</span>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="py-20 text-center">
            <History className="w-10 h-10 text-indigo-400/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No test executions found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Either search query mismatch or no automation sessions initialized for this account yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px] font-bold tracking-wider uppercase select-none">
                  <th className="py-4 px-6">Test Run Identification</th>
                  <th className="py-4 px-6">Outcome Status</th>
                  <th className="py-4 px-6 hidden sm:table-cell">Trigger Date</th>
                  <th className="py-4 px-6 hidden md:table-cell">Duration</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs">
                {filteredRuns.map((record) => (
                  <tr 
                    key={record.id}
                    className="hover:bg-[#0F172A]/30 transition-colors cursor-pointer group"
                  >
                    {/* ID & Title */}
                    <td onClick={() => onSelectRun(record.id)} className="py-4.5 px-6 max-w-sm">
                      <p className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors truncate">{record.title}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">id: {record.id}</p>
                    </td>

                    {/* Status badge */}
                    <td onClick={() => onSelectRun(record.id)} className="py-4.5 px-6">
                      {record.status === 'Passed' || record.final_result === 'Passed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          <span>Passed</span>
                        </span>
                      ) : record.status === 'Failed' || record.final_result === 'Failed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                          <XCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      ) : record.status === 'Running' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 animate-pulse">
                          <span>Running</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          <span>Pending</span>
                        </span>
                      )}
                    </td>

                    {/* Trigger Date timestamp */}
                    <td onClick={() => onSelectRun(record.id)} className="py-4.5 px-6 text-slate-400 hidden sm:table-cell font-mono">
                      {new Date(record.started_at).toLocaleString()}
                    </td>

                    {/* Duration seconds */}
                    <td onClick={() => onSelectRun(record.id)} className="py-4.5 px-6 text-slate-400 hidden md:table-cell font-mono">
                      {record.execution_time ? `${record.execution_time} seconds` : '---'}
                    </td>

                    {/* Actions column */}
                    <td className="py-4.5 px-6 text-right shrink-0">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => onSelectRun(record.id)}
                          className="p-1.5 rounded-lg bg-slate-800 border border-slate-700/80 hover:bg-slate-700 text-slate-200 transition-colors"
                          title="Open report page"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
