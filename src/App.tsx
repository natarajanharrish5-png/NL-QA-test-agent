import React, { useState, useEffect } from 'react';
import Login from './components/Login.tsx';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import Dashboard from './components/Dashboard.tsx';
import CreateTest from './components/CreateTest.tsx';
import ExecutionMonitor from './components/ExecutionMonitor.tsx';
import TestHistory from './components/TestHistory.tsx';
import AISuggestions from './components/AISuggestions.tsx';
import TestResults from './components/TestResults.tsx';
import { ActionPlan } from './types';

export default function App() {
  const [user, setUser] = useState<{ id: string; email: string; full_name: string } | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  
  // Specific records states for execution monitoring and diagnostic reports
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<ActionPlan | null>(null);

  // Load cookies / local storage session bindings on first mount
  useEffect(() => {
    const storedToken = localStorage.getItem('qa_agent_token');
    const storedUser = localStorage.getItem('qa_agent_user');
    if (storedToken && storedUser) {
      setUser(JSON.parse(storedUser));
      setUserToken(storedToken);
    }
  }, []);

  const handleLoginSuccess = (token: string, userData: { id: string; email: string; full_name: string }) => {
    localStorage.setItem('qa_agent_token', token);
    localStorage.setItem('qa_agent_user', JSON.stringify(userData));
    setUser(userData);
    setUserToken(token);
    setActiveSection('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('qa_agent_token');
    localStorage.removeItem('qa_agent_user');
    setUser(null);
    setUserToken(null);
    setActiveSection('dashboard');
    setActiveRunId(null);
    setActivePlan(null);
  };

  // Auth Guard Gate
  if (!user || !userToken) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Dynamic header titles based on section state
  let sectionTitle = 'Workplace overview';
  if (activeSection === 'dashboard') sectionTitle = 'Automation Dashboard';
  else if (activeSection === 'create') sectionTitle = 'Test Planning Wizard';
  else if (activeSection === 'execution_monitor') sectionTitle = 'Live Sandbox Session';
  else if (activeSection === 'history') sectionTitle = 'Run Ledger History';
  else if (activeSection === 'suggestions') sectionTitle = 'AI Quality Auditor';
  else if (activeSection === 'results') sectionTitle = 'Run Outcomes Report';

  return (
    <div id="application-container" className="flex h-screen bg-[#0F172A] font-sans text-slate-100 overflow-hidden select-none">
      
      {/* PERSISTENT LEFT DECORATIVE SIDEBAR */}
      <Sidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        user={user} 
        onLogout={handleLogout} 
      />

      {/* RIGHT GRID MODULE FRAME */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP LAYOUT BAR */}
        <Header title={sectionTitle} />

        {/* SCROLLABLE INDIVIDUAL SECTIONS CANVAS */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {activeSection === 'dashboard' && (
            <Dashboard 
              onNavigateToCreate={() => setActiveSection('create')} 
              onSelectRun={(runId) => {
                setActiveRunId(runId);
                setActiveSection('results');
              }}
              userToken={userToken}
            />
          )}

          {activeSection === 'create' && (
            <CreateTest 
              userToken={userToken} 
              onExecutionStarted={(runId, plan) => {
                setActiveRunId(runId);
                setActivePlan(plan);
                setActiveSection('execution_monitor');
              }}
            />
          )}

          {activeSection === 'execution_monitor' && activeRunId && activePlan && (
            <ExecutionMonitor 
              runId={activeRunId} 
              actionPlan={activePlan} 
              userToken={userToken}
              onViewReport={(runId) => {
                setActiveRunId(runId);
                setActiveSection('results');
              }}
            />
          )}

          {activeSection === 'history' && (
            <TestHistory 
              userToken={userToken} 
              onSelectRun={(runId) => {
                setActiveRunId(runId);
                setActiveSection('results');
              }}
            />
          )}

          {activeSection === 'suggestions' && (
            <AISuggestions 
              userToken={userToken} 
              onNavigateToCreate={() => setActiveSection('create')}
            />
          )}

          {activeSection === 'results' && activeRunId && (
            <TestResults 
              runId={activeRunId} 
              userToken={userToken} 
              onBackToHistory={() => setActiveSection('history')}
            />
          )}
        </main>

      </div>
    </div>
  );
}
