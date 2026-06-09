import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  Eye, 
  Terminal, 
  Award, 
  ChevronRight, 
  Layers,
  ArrowLeft,
  FileDown
} from 'lucide-react';
import { TestRunFull, ActionStep, DbVerification } from '../types';

interface TestResultsProps {
  runId: string;
  userToken: string;
  onBackToHistory: () => void;
}

export default function TestResults({ runId, userToken, onBackToHistory }: TestResultsProps) {
  const [report, setReport] = useState<TestRunFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStepNum, setSelectedStepNum] = useState<number>(1);
  const [activeTab, setActiveStepTab] = useState<'details' | 'assertions'>('details');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/execution/${runId}`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const data = await res.json();
      setReport(data);
      if (data && data.steps && data.steps.length > 0) {
        setSelectedStepNum(data.steps[0].step_number);
      }
    } catch (e) {
      console.error('Failed to load specific test run outcomes report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [runId]);

  if (loading) {
    return (
      <div className="p-8 text-center py-24 text-slate-500 font-medium font-sans">
        <span className="animate-pulse">Retrieving test diagnostic run records...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center py-20 font-sans">
        <AlertTriangleOutline className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-sm text-slate-400 font-bold">Execution logs not found.</p>
        <button onClick={onBackToHistory} className="mt-4 px-4 py-2 bg-slate-800 rounded text-xs text-white">Back</button>
      </div>
    );
  }

  const { run, testCaseName, testPrompt, steps, verifications, screenshots } = report;
  const isPassed = run.final_result === 'Passed' || run.status === 'Passed';
  
  const totalStepsCount = steps.length;
  const passedStepsCount = steps.filter(s => s.execution_status === 'Passed' || s.status === 'Passed' || s.status === 'Passed').length;
  const failedStepsCount = totalStepsCount - passedStepsCount;

  // Selected Step detailed content
  const selectedStep = steps.find(s => s.step_number === selectedStepNum);
  const selectedScreenshot = screenshots.find(s => s.step_number === selectedStepNum);
  const selectedVerify = verifications.find(v => v.step_number === selectedStepNum);

  return (
    <div id="test-results-view" className="p-8 pb-16 space-y-8 text-[#F8FAFC]">
      
      {/* HEADER AND BACK TRIGGERS */}
      <div className="flex items-center gap-3 select-none">
        <button
          onClick={onBackToHistory}
          className="p-2 rounded-lg bg-slate-800 border border-slate-700/80 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Back to execution ledger history"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-[10px] text-slate-500 font-mono">RUN IDENTIFICATION: {run.id}</span>
          <h1 className="text-xl font-bold tracking-tight text-white leading-none mt-0.5">{testCaseName}</h1>
        </div>
      </div>

      {/* HUGE COLORED OUTCOME BANNER */}
      <div className={`p-6 border rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative ${
        isPassed 
          ? 'bg-gradient-to-r from-emerald-950/20 to-slate-900 border-emerald-500/20' 
          : 'bg-gradient-to-r from-red-950/20 to-slate-900 border-red-500/20'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3.5 rounded-xl shrink-0 ${
            isPassed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-100'
          }`}>
            <Award className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-mono uppercase bg-slate-850 px-2 py-0.5 rounded text-slate-400 font-bold border border-slate-800">EXECUTION FINISHED</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-mono">{new Date(run.started_at).toLocaleString()}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight font-sans mt-2.5 flex items-center gap-2">
              <span>Final Suite Result:</span>
              <span className={isPassed ? 'text-emerald-400' : 'text-red-400'}>{isPassed ? 'TEST PASSED' : 'TEST FAILED'}</span>
            </h2>
          </div>
        </div>

        {/* Download links */}
        <div className="flex items-center gap-3">
          <a
            href={`/api/reports/download/${run.id}`}
            download={`report_${run.id}.json`}
            className="px-4.5 py-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 font-semibold text-xs rounded-lg flex items-center gap-2 text-slate-200 transition-colors shadow-sm text-center"
          >
            <Download className="w-4 h-4" />
            <span>Export Suite JSON Report</span>
          </a>
        </div>
      </div>

      {/* METRICS INDEX TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Planned Steps</span>
          <p className="text-2xl font-bold font-sans mt-1.5">{totalStepsCount}</p>
        </div>
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Passed Checklist</span>
          <p className="text-2xl font-bold font-sans text-emerald-400 mt-1.5">{isPassed ? totalStepsCount : passedStepsCount}</p>
        </div>
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Failed Checklist</span>
          <p className="text-2xl font-bold font-sans text-red-400 mt-1.5">{isPassed ? 0 : failedStepsCount}</p>
        </div>
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4.5 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Run duration</span>
            <p className="text-2xl font-bold font-sans mt-1.5">{run.execution_time ? `${run.execution_time}s` : '---'}</p>
          </div>
          <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        </div>
      </div>

      {/* REPORT CONTENT DETAILED ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Layout Checklist (2 cols) */}
        <div className="lg:col-span-2 bg-[#1E293B] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold tracking-tight uppercase text-slate-400 pb-2 border-b border-slate-850 select-none">Action Step checklist logs</h3>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {steps.map((st) => {
              const isActive = selectedStepNum === st.step_number;
              // Treat everything passed if final run is passed, or match step status
              const currentStepPassed = isPassed || st.execution_status === 'Passed' || st.status === 'Passed';
              const currentStepFailed = !isPassed && !currentStepPassed && st.step_number === steps.length;

              return (
                <div
                  key={st.step_number}
                  onClick={() => setSelectedStepNum(st.step_number)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors duration-150 flex items-start gap-3 select-none ${
                    isActive 
                      ? 'bg-indigo-500/10 border-indigo-500/50 text-white' 
                      : currentStepPassed 
                        ? 'bg-emerald-500/[0.02] border-slate-850 text-slate-350 hover:bg-[#0F172A]' 
                        : currentStepFailed
                          ? 'bg-red-500/[0.02] border-slate-850 text-slate-300 hover:bg-[#0F172A]'
                          : 'bg-[#0F172A] border-slate-850 text-slate-400 hover:bg-[#0F172A]/80'
                  }`}
                >
                  <div className="shrink-0 mt-0.5 animate-fade-in">
                    {currentStepPassed ? (
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                    ) : currentStepFailed ? (
                      <XCircle className="w-4.5 h-4.5 text-red-400" />
                    ) : (
                      <span className="w-4.5 h-4.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-[10px] flex items-center justify-center font-bold text-slate-450">{st.step_number}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-850 px-1 py-0.5 rounded border border-slate-750 font-medium shrink-0 leading-none">{st.action}</span>
                      <p className="text-xs font-bold truncate max-w-[130px] font-mono leading-none">{st.target}</p>
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

        {/* Right Layout Viewport & Assertion diagnostic panels (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Simulated Active View Window */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-1.5 shadow-sm">
            {!selectedScreenshot ? (
              <div className="h-[340px] bg-[#0A0D17] border border-slate-850 rounded-lg flex flex-col items-center justify-center text-center p-6 select-none font-sans">
                <Layers className="w-10 h-10 text-indigo-400/20 mb-3" />
                <p className="text-xs font-bold text-slate-400">No screenshot recorded at this step sequence.</p>
              </div>
            ) : (
              <div className="w-full h-[340px] relative rounded-lg overflow-hidden border border-slate-850 select-none">
                <img 
                  src={selectedScreenshot.file_path} 
                  alt={`Step ${selectedStepNum} Captured Layout Viewport`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain bg-[#0F172A]"
                />
              </div>
            )}
          </div>

          {/* Details & Assertions Tabs Toggle box */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            
            {/* Headers tab click triggers */}
            <div className="flex items-center gap-4 pb-2 border-b border-slate-850 text-xs font-bold text-slate-400 select-none">
              <button
                onClick={() => setActiveStepTab('details')}
                className={`pb-2 border-b-2 px-1 relative transition-colors cursor-pointer ${
                  activeTab === 'details' ? 'border-[#6366F1] text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-350'
                }`}
              >
                Step Parameters Details
              </button>
              <button
                onClick={() => setActiveStepTab('assertions')}
                className={`pb-2 border-b-2 px-1 relative transition-colors cursor-pointer ${
                  activeTab === 'assertions' ? 'border-[#6366F1] text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-350'
                }`}
              >
                Verification outcomes
              </button>
            </div>

            {/* TAB-1 Details Panels */}
            {activeTab === 'details' && (
              <div className="space-y-3.5 text-xs font-sans">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">ACTION SCHEME TARGET</span>
                    <p className="font-mono text-slate-205 font-bold mt-1 break-all bg-[#0F172A] border border-slate-850 p-2 rounded">{selectedStep?.target || '---'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">ACTION SCHEME INPUT VALUE</span>
                    <p className="font-mono text-slate-205 font-bold mt-1 break-all bg-[#0F172A] border border-slate-850 p-2 rounded">{selectedStep?.value || 'null (not specified)'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">TIMEOUT CONSTRAINT</span>
                    <p className="font-mono text-slate-205 mt-1 font-bold bg-[#0F172A] p-2 rounded">{selectedStep?.timeout_seconds || '15'} seconds</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">RETRY RE-RUN LIMITS</span>
                    <p className="font-mono text-slate-205 mt-1 font-bold bg-[#0F172A] p-2 rounded">{selectedStep?.retry || '3'} maximum attempts</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB-2 Assertions Panel */}
            {activeTab === 'assertions' && (
              <div className="space-y-4">
                {!selectedVerify ? (
                  <div className="p-3.5 bg-[#0F172A] font-sans rounded border border-slate-850 text-slate-500 text-xs">
                    No validation assertions triggered at this exact step sequence.
                  </div>
                ) : (
                  <div className="space-y-3.5 text-xs font-sans">
                    <div className="p-3.5 bg-emerald-500/[0.02] border border-emerald-500/10 rounded flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Verification Type Mapped</span>
                        <p className="font-bold text-white uppercase text-xs mt-1">TEXT VISIBILITY CHECK</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-bold text-[10px] tracking-wider uppercase select-none">
                        SUCCESS MATCH
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">EXPECTED PAGE VALUE OR INNER TEXT</span>
                        <p className="font-mono font-medium text-emerald-400 bg-[#0F172A] border border-emerald-500/15 p-2 rounded mt-1 break-all">"{selectedVerify.expected_result}"</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">OBSERVED DOM VALUE AT VERIFICATION TIME</span>
                        <p className="font-mono font-medium text-slate-200 bg-[#0F172A] border border-slate-850 p-2 rounded mt-1 break-all">"{selectedVerify.actual_result || 'Verified successfully'}"</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

// Quick inline Alert Icon outline simulator
function AlertTriangleOutline(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
