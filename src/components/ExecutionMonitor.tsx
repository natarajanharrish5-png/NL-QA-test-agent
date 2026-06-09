import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Terminal, 
  CheckCircle, 
  XCircle, 
  Eye, 
  ArrowRight,
  RefreshCw,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';
import { ActionPlan, ActionStep, ExecutionLog } from '../types';

interface ExecutionMonitorProps {
  runId: string;
  actionPlan: ActionPlan;
  userToken: string;
  onViewReport: (runId: string) => void;
}

export default function ExecutionMonitor({ runId, actionPlan, userToken, onViewReport }: ExecutionMonitorProps) {
  const [steps, setSteps] = useState<ActionStep[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [activeStepNum, setActiveStepNum] = useState<number | null>(null);
  const [viewportSrc, setViewportSrc] = useState<string>('');
  const [status, setStatus] = useState<'running' | 'passed' | 'failed' | 'pending'>('running');
  const [duration, setDuration] = useState(0);
  const [failureSummary, setFailureSummary] = useState('');

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  // Initialize steps list with local status mappings
  useEffect(() => {
    if (actionPlan && actionPlan.steps) {
      setSteps(
        actionPlan.steps.map(step => ({
          ...step,
          execution_status: step.step_number === 1 ? 'Pending' : 'Pending'
        }))
      );
    }
    
    // Start duration counter timer
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [actionPlan, runId]);

  // Connect WebSocket stream
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/stream?run_id=${runId}`;
    
    console.log('Connecting websocket to stream:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connection established successfully for', runId);
      setLogs([{
        level: 'info',
        message: 'Established real-time logging sub-socket. Initiating browser run...',
        timestamp: new Date().toISOString()
      }]);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'log') {
        setLogs(prev => [...prev, msg.payload]);
      } else if (msg.type === 'step_update') {
        const { step_number, status: stepStatus } = msg.payload;
        
        if (stepStatus === 'running') {
          setActiveStepNum(step_number);
        }

        setSteps(prev => 
          prev.map(step => {
            if (step.step_number === step_number) {
              return { 
                ...step, 
                execution_status: stepStatus === 'passed' ? 'Passed' : stepStatus === 'failed' ? 'Failed' : 'Running' 
              };
            }
            return step;
          })
        );
      } else if (msg.type === 'screenshot') {
        // Update screenshot dynamically inside the responsive Chrome viewport
        setViewportSrc(msg.payload.file_path);
      } else if (msg.type === 'final_report') {
        if (timerRef.current) clearInterval(timerRef.current);
        
        const isPassed = msg.payload.final_result === 'TEST PASSED';
        setStatus(isPassed ? 'passed' : 'failed');
        setFailureSummary(msg.payload.summary);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket monitor stream encountered error:', err);
    };

    ws.onclose = () => {
      console.log('WebSocket monitor stream closed.');
    };

    return () => {
      ws.close();
    };
  }, [runId]);

  // Scroll to bottom of terminal console dynamically
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Calculate completion percentage dynamically
  const completedCount = steps.filter(s => s.execution_status === 'Passed' || s.execution_status === 'Failed').length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div id="execution-monitor-view" className="p-8 pb-16 space-y-8 text-[#F8FAFC]">
      
      {/* HEADER BAR AND STATUS TAG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Active Execution Session</h1>
            
            {status === 'running' ? (
              <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                <span>Active Stream</span>
              </span>
            ) : status === 'passed' ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Test Passed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider">
                <XCircle className="w-3.5 h-3.5" />
                <span>Test Failed</span>
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">Inspecting actions, timing constraints, and simulated DOM assets dynamically.</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono font-bold text-slate-400 bg-[#1E293B] border border-slate-800 p-3.5 rounded-xl shrink-0">
          <Clock className="w-4.5 h-4.5 text-indigo-400" />
          <span>ELLAPSED DURATION: {duration}s</span>
        </div>
      </div>

      {/* PROGRESS TRACKER */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm select-none">
        <span className="text-xs font-bold text-slate-400 tracking-wider">PROGRESS</span>
        <div className="flex-1 bg-[#0F172A] p-0.5 rounded-full h-4 border border-slate-850/50 overflow-hidden">
          <div 
            className="bg-[#6366F1] h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <span className="font-mono text-xs font-bold text-indigo-400">{progressPercent}%</span>
      </div>

      {/* MAIN TWO PANEL CONTENT COUPLING */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Side: Stepper Actions Checklist (2 cols) */}
        <div className="lg:col-span-2 bg-[#1E293B] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold tracking-tight uppercase text-slate-400 pb-2 border-b border-slate-850 select-none">Execution Step Sequence</h3>
          
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {steps.map((st) => {
              const isCurrent = activeStepNum === st.step_number && status === 'running';
              const isPassed = st.execution_status === 'Passed';
              const isFailed = st.execution_status === 'Failed';

              return (
                <div 
                  key={st.step_number} 
                  className={`p-3 rounded-lg border transition-colors duration-150 flex items-start gap-3 select-none ${
                    isCurrent 
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-blue-100' 
                      : isPassed 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300' 
                        : isFailed 
                          ? 'bg-red-500/5 border-red-500/20 text-slate-300'
                          : 'bg-[#0F172A] border-slate-850 text-slate-400'
                  }`}
                >
                  {/* Status symbol indicator */}
                  <div className="shrink-0 mt-0.5">
                    {isPassed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : isFailed ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : isCurrent ? (
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                        {st.step_number}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/60 leading-none shrink-0">{st.action}</span>
                      <p className="text-xs font-bold truncate shrink-0 max-w-[130px] font-mono">{st.target}</p>
                    </div>
                    {st.value && (
                      <p className="text-[10px] font-mono text-slate-500 truncate mt-1">value: "{st.value}"</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: High Fidelity Page Viewport & Console Log (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Simulated view section */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-1.5 shadow-sm relative overflow-hidden">
            
            {!viewportSrc ? (
              <div className="h-[360px] bg-[#0A0D17] border border-slate-850 rounded-lg flex flex-col items-center justify-center text-center p-6 select-none">
                <RefreshCw className="w-8 h-8 text-indigo-400/30 animate-spin mb-3" />
                <p className="text-xs font-bold text-slate-400">Loading automation chrome session...</p>
              </div>
            ) : (
              <div className="w-full h-[360px] relative rounded-lg overflow-hidden border border-slate-850">
                <img 
                  src={viewportSrc} 
                  alt="Simulated Cloud Browser Viewport"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain bg-[#0F172A]"
                />
              </div>
            )}
          </div>

          {/* Terminal Console Logs */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-850 select-none">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live System Output Terminal</span>
            </div>

            <div className="h-32 bg-[#0F172A] border border-slate-850 rounded-lg p-3.5 font-mono text-xs overflow-y-auto space-y-1.5 text-[#38BDF8]">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 select-all leading-normal">
                  <span className="text-slate-600 shrink-0 font-medium">[{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '---'}]</span>
                  <span className={`shrink-0 uppercase font-bold text-[10px] tracking-wide rounded px-1 mt-0.5 leading-none ${
                    log.level === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>{log.level}</span>
                  <span className={log.level === 'error' ? 'text-red-400' : 'text-slate-200'}>{log.message}</span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>

        </div>

      </div>

      {/* FINAL STATE OUTCOME SCREEN MODAL-LIKE ACCENTS */}
      {status !== 'running' && (
        <div className="p-6 bg-gradient-to-r from-indigo-950/20 to-slate-900 border border-indigo-500/20 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 transform animate-fade-in">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${status === 'passed' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <span>Outcome:</span>
                <span className={status === 'passed' ? 'text-emerald-400' : 'text-red-400'}>{status === 'passed' ? 'TEST PASSED' : 'TEST FAILED'}</span>
              </h3>
              <p className="text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">{failureSummary}</p>
            </div>
          </div>

          <button
            onClick={() => onViewReport(runId)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm rounded-lg flex items-center gap-2 text-white shrink-0 shadow-lg hover:shadow-indigo-500/10 cursor-pointer transition-colors"
          >
            <span>Inspect Suite Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
