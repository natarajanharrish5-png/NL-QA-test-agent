import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, User as UserIcon, ArrowRight, Info } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, user: { id: string; email: string; full_name: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !fullName)) {
      setError('Please fill in all required fields.');
      return;
    }

    setError('');
    setLoading(true);

    const url = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister 
      ? { email, full_name: fullName, password }
      : { email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Connecting to server failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemo = () => {
    onLoginSuccess('demo@example.com', {
      id: 'demo-user-id',
      email: 'demo@example.com',
      full_name: 'Demo QA Engineer'
    });
  };

  return (
    <div id="login-container" className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-[#F8FAFC]">
      <div className="w-full max-w-md">
        
        {/* LOGO AND BRAND HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mb-4 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">NL Browser Test Agent</h1>
          <p className="text-sm text-[#CBD5E1] mt-1.5 font-sans">Convert English instructions into Playwright automations</p>
        </div>

        {/* AUTHENTICATION CARD */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-8 shadow-xl">
          <h2 className="text-lg font-semibold mb-6">
            {isRegister ? 'Create your QA Account' : 'Sign in to platform workspace'}
          </h2>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">FULL NAME</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aly Jafar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-800 focus:border-indigo-500/60 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-800 focus:border-indigo-500/60 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-800 focus:border-indigo-500/60 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#6366F1] hover:bg-indigo-600 font-medium text-sm py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer text-white"
            >
              <span>{loading ? 'Processing...' : isRegister ? 'Register & Launch' : 'Enter Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* CHANGER ACTION */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              {isRegister ? 'Already have an account?' : 'New to sandbox?'}
            </span>
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline focus:outline-none cursor-pointer"
            >
              {isRegister ? 'Sign In instead' : 'Create an Account'}
            </button>
          </div>
        </div>

        {/* QUICK DEMO GUEST LOGIN LINK */}
        <div className="text-center mt-6">
          <button
            onClick={handleUseDemo}
            className="text-xs text-slate-500 hover:text-slate-400 transition-colors underline cursor-pointer"
          >
            Or, bypass authorization &amp; enter as Guest Demo QA
          </button>
        </div>

      </div>
    </div>
  );
}
