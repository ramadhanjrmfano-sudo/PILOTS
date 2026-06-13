/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, Phone, User, LogIn, UserPlus, Info, CheckCircle2 } from 'lucide-react';
import { AppUser } from '../types';
import { synth } from '../utils/audio';

interface AuthScreensProps {
  onLoginSuccess: (user: AppUser) => void;
  registeredUsers: AppUser[];
  onRegisterUser: (user: AppUser) => void;
  isAdminRoute: boolean;
  onSwitchView: (isAdmin: boolean) => void;
}

export const AuthScreens: React.FC<AuthScreensProps> = ({
  onLoginSuccess,
  registeredUsers,
  onRegisterUser,
  isAdminRoute,
  onSwitchView,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [supabaseStatus, setSupabaseStatus] = useState<{ configured: boolean; url: string | null } | null>(null);

  React.useEffect(() => {
    fetch('/api/supabase-status')
      .then(res => res.json())
      .then(data => setSupabaseStatus(data))
      .catch(() => {});
  }, []);
  
  // Forms state
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Lockout countdown state
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number>(0);

  // Monitor and update lockout countdown real-time
  React.useEffect(() => {
    const checkLockout = () => {
      const savedLockout = localStorage.getItem('pilot_lockout_time');
      if (savedLockout) {
        const until = Number(savedLockout);
        const diff = Math.ceil((until - Date.now()) / 1000);
        if (diff > 0) {
          setLockoutTimeLeft(diff);
        } else {
          setLockoutTimeLeft(0);
          localStorage.removeItem('pilot_lockout_time');
          localStorage.removeItem('pilot_failed_attempts');
        }
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleAuthMode = () => {
    synth.playClick();
    setIsLogin(!isLogin);
    setPhone('');
    setName('');
    setUsername('');
    setPassword('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Pre-check: is locked out currently?
    const savedLockout = localStorage.getItem('pilot_lockout_time');
    if (savedLockout) {
      const until = Number(savedLockout);
      if (Date.now() < until) {
        const remainingSec = Math.ceil((until - Date.now()) / 1000);
        const mins = Math.floor(remainingSec / 60);
        const secs = remainingSec % 60;
        synth.playError();
        setErrorMsg(`UMEZUIWA: Umeingiza taarifa zisizo sahihi mara 7. Subiri dakika ${mins}:${secs < 10 ? '0' : ''}${secs} kabla ya kujaribu tena!`);
        return;
      }
    }

    if (!phone || !password) {
      synth.playError();
      setErrorMsg('Tafadhali jaza namba ya simu / username na password.');
      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      if (response.ok) {
        const user = await response.json();
        localStorage.removeItem('pilot_failed_attempts');
        localStorage.removeItem('pilot_lockout_time');
        synth.playAviatorCrash();
        onLoginSuccess(user);
      } else {
        const errData = await response.json();
        const errMsg = errData.error || 'Namba ya simu au password si sahihi!';
        synth.playError();

        if (response.status === 403 || errData.locked) {
          const lockoutUntil = Date.now() + 15 * 60 * 1000;
          localStorage.setItem('pilot_lockout_time', String(lockoutUntil));
          setLockoutTimeLeft(900);
          setErrorMsg(errMsg);
        } else {
          const currentFailures = Number(localStorage.getItem('pilot_failed_attempts') || '0') + 1;
          localStorage.setItem('pilot_failed_attempts', String(currentFailures));

          if (currentFailures >= 7) {
            const lockoutUntil = Date.now() + 15 * 60 * 1000;
            localStorage.setItem('pilot_lockout_time', String(lockoutUntil));
            setLockoutTimeLeft(900);
            setErrorMsg('UMEZUIWA: Umeingiza password isiyo sahihi mara 7! Umezuiwa (lockout) kutumia mfumo huu kwa muda wa dakika 15 kulinda udukuzi.');
          } else {
            const attemptsLeft = 7 - currentFailures;
            setErrorMsg(`Namba ya simu/Username au password si sahihi! Una nafasi ${attemptsLeft} zaidi za kujaribu kabla ya kuzuiliwa kwa dakika 15.`);
          }
        }
      }
    } catch (err) {
      synth.playError();
      setErrorMsg('Mawasiliano na server yamefeli. Tafadhali jaribu tena baadae.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name || !username || !phone || !password) {
      synth.playError();
      setErrorMsg('Tafadhali jaza taarifa zote kukamilisha usajili.');
      return;
    }

    if (username.length < 3) {
      synth.playError();
      setErrorMsg('Jina la mtumiaji (Username) lazima liwe na angalau herufi 3.');
      return;
    }

    if (phone.length < 4) {
      synth.playError();
      setErrorMsg('Namba ya simu lazima iwe na angalau tarakimu 4 au herufi.');
      return;
    }

    // Safety checks: normal user can NOT register with the admin phone number
    if (phone.trim() === '0743288942') {
      synth.playError();
      setErrorMsg('Namba hii ya simu tayari imesajiliwa kama Admin na haiwezi kutumiwa na User wa kawaida.');
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, phone, password })
      });

      if (response.ok) {
        const newUser = await response.json();
        onRegisterUser(newUser);
        synth.playSuccess();
        setSuccessMsg('Usajili Umefanikiwa kikamilifu! Sasa unaingizwa kwenye kurasa ya kusubiri kibali cha Admin.');
      } else {
        const errData = await response.json();
        synth.playError();
        setErrorMsg(errData.error || 'Namba hii tayari imesajiliwa au usajili umefeli.');
      }
    } catch (err) {
      synth.playError();
      setErrorMsg('Inashindwa kuwasiliana na server kwa sasa. Tafadhali jaribu tena.');
    }
  };

  const fillQuickAccess = (phoneVal: string, passVal: string) => {
    if (lockoutTimeLeft > 0) {
      synth.playError();
      setErrorMsg('Umezuiwa kuingia kwa sasa!');
      return;
    }
    synth.playClick();
    setPhone(phoneVal);
    setPassword(passVal);
  };

  const renderLockoutMessage = () => {
    const mins = Math.floor(lockoutTimeLeft / 60);
    const secs = lockoutTimeLeft % 60;
    return `Kujaribu kuingia kumezuiliwa! Tafadhali subiri dakika ${mins}:${secs < 10 ? '0' : ''}${secs} ili ujaribu tena.`;
  };

  return (
    <div className="w-full max-w-md mx-auto relative px-4 flex flex-col justify-center items-center">
      
      <div className="w-full bg-[#00640005] backdrop-blur-xl border border-[#C0C0C040] rounded-[36px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(0,100,0,0.15)] overflow-hidden relative">
        <div className="absolute inset-0 border border-[#C0C0C010] rounded-[36px] pointer-events-none" />

        {/* Form header branding switcher */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-[#006400] to-black border border-[#C0C0C040] mb-3">
            {isAdminRoute ? (
              <KeyRound className="w-8 h-8 text-yellow-500 animate-pulse" />
            ) : isLogin ? (
              <LogIn className="w-8 h-8 text-[#C0C0C0]" />
            ) : (
              <UserPlus className="w-8 h-8 text-[#39FF14]" />
            )}
          </div>
          
          <h2 className="font-display font-bold text-xl sm:text-2xl text-white tracking-wider uppercase">
            {isAdminRoute ? 'Admin Control Entry' : isLogin ? 'Ingia Kwenye Mfumo' : 'Sajili Akaunti yako'}
          </h2>
          <p className="text-[9px] text-[#C0C0C0]/60 font-mono tracking-widest mt-1 uppercase">
            {isAdminRoute ? 'ADMIN ACCESS GATEWAY' : isLogin ? 'MEMBER SYSTEM INSTANCE' : 'REGISTER TO GET ACTIVE SIGNALS'}
          </p>
          {supabaseStatus && (
            <div className="flex justify-center mt-2.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[8px] font-mono tracking-wider font-extrabold uppercase border transition-all ${
                supabaseStatus.configured 
                  ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20' 
                  : 'bg-amber-950/20 text-amber-500 border-amber-500/10'
              }`}>
                <span className={`h-1 cursor-default w-1 rounded-full ${supabaseStatus.configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>Supabase Auth: {supabaseStatus.configured ? "ONLINE" : "OFFLINE (Local Mode)"}</span>
              </span>
            </div>
          )}
        </div>

        {/* Direct Link Info box to clearly show separate links */}
        <div className="mb-4 py-1.5 px-3 bg-zinc-950/90 border border-[#C0C0C020] rounded-xl text-center">
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider block">LINK YA UKURASA HUU</span>
          <code className="text-[10px] text-zinc-300 font-mono break-all opacity-85 select-all">
            {window.location.origin}{window.location.pathname}?view={isAdminRoute ? 'admin' : 'user'}
          </code>
        </div>

        {/* Lockout dynamic warning alert banner */}
        {lockoutTimeLeft > 0 && (
          <div className="mb-4 p-4 bg-red-950/90 border border-red-500 rounded-2xl text-red-300 text-xs font-semibold leading-relaxed relative overflow-hidden flex flex-col gap-1.5 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <span>🚨 SECURE LOCKOUT ACTIVE 🚨</span>
            </div>
            <p className="font-mono">{renderLockoutMessage()}</p>
          </div>
        )}

        {/* Error notification banner */}
        {errorMsg && lockoutTimeLeft === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-950/80 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold leading-relaxed flex items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {/* Success notification banner */}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3.5 bg-[#003300]/80 border border-[#39FF14]/40 rounded-xl text-[#39FF14] text-xs font-semibold leading-relaxed flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 animate-bounce" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {/* LOGIN FORM (Admin route or traditional user login) */}
        {isAdminRoute || isLogin ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#C0C0C0]/70 mb-1.5">
                {isAdminRoute ? 'Namba ya Simu/Username ya Admin' : 'Jina la Mtumiaji au Namba ya Simu'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#C0C0C0]/50">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder={isAdminRoute ? 'Mfano: admin au 0743288942' : 'Ingiza Username au Namba ya Simu'}
                  disabled={lockoutTimeLeft > 0}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/60 border border-[#C0C0C040] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-[#C0C0C030] outline-none focus:border-[#39FF14] focus:shadow-[0_0_10px_rgba(57,255,20,0.2)] transition-all font-mono disabled:opacity-40"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#C0C0C0]/70 mb-1.5">
                Nenosiri (Password)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#C0C0C0]/50">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="Weka password yako hapa"
                  disabled={lockoutTimeLeft > 0}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/60 border border-[#C0C0C040] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-[#C0C0C030] outline-none focus:border-[#39FF14] focus:shadow-[0_0_10px_rgba(57,255,20,0.2)] transition-all font-mono disabled:opacity-40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={lockoutTimeLeft > 0}
              className={`w-full py-3.5 mt-2 rounded-xl bg-gradient-to-b border text-white text-sm font-bold uppercase tracking-wider cursor-pointer btn-premium-glow flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none ${
                isAdminRoute ? 'from-amber-700 to-amber-950 border-amber-500' : 'from-[#006400] to-[#001e00] border-[#C0C0C0]'
              }`}
            >
              <LogIn className={`w-4 h-4 ${isAdminRoute ? 'text-amber-400' : 'text-[#39FF14]'}`} />
              <span>{isAdminRoute ? 'ADMIN ACCESS LOG IN' : 'CONNECT USER'}</span>
            </button>
          </form>
        ) : (
          /* TRADITIONAL REGISTRATION FORM FOR NORMAL USERS */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#C0C0C0]/70 mb-1.5">
                Jina Lako Kamili
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#C0C0C0]/50">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Mfano: Ally Salum"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/60 border border-[#C0C0C040] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-[#C0C0C030] outline-none focus:border-[#39FF14] focus:shadow-[0_0_10px_rgba(57,255,20,0.2)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#C0C0C0]/70 mb-1.5">
                Jina la Mtumiaji (Username)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#C0C0C0]/50">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Mfano: allysalum"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/60 border border-[#C0C0C040] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-[#C0C0C030] outline-none focus:border-[#39FF14] focus:shadow-[0_0_10px_rgba(57,255,20,0.2)] transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#C0C0C0]/70 mb-1.5">
                Namba yako ya Simu
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#C0C0C0]/50">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Mfano: 0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/60 border border-[#C0C0C040] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-[#C0C0C030] outline-none focus:border-[#39FF14] focus:shadow-[0_0_10px_rgba(57,255,20,0.2)] transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#C0C0C0]/70 mb-1.5">
                Nenosiri unalotaka (Password)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#C0C0C0]/50">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="Weka password ya kuingilia baadae"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/60 border border-[#C0C0C040] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-[#C0C0C030] outline-none focus:border-[#39FF14] focus:shadow-[0_0_10px_rgba(57,255,20,0.2)] transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-b from-[#003300] to-[#011401] border border-[#39FF14]/50 hover:border-[#39FF14] text-[#39FF14] text-sm font-bold uppercase tracking-wider cursor-pointer btn-premium-glow flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>SAJILI SASA</span>
            </button>
          </form>
        )}

        {/* Alternate link selector helper (only shown if not on AdminRoute) */}
        {!isAdminRoute && (
          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <button
              onClick={toggleAuthMode}
              className="text-[11px] font-mono text-[#C0C0C0] hover:text-[#39FF14] tracking-wider transition-colors duration-200 cursor-pointer"
            >
              {isLogin ? 'HAUNA AKAUNTI bado? JISAJILI HAPA' : 'TAYARI UNA AKAUNTI? INGIA hapa'}
            </button>
          </div>
        )}

        {/* Separate link navigation selector to dynamically switch routes inside the app */}
        <div className="mt-4 pt-3 border-t border-white/5 text-center flex flex-col gap-2">
          {isAdminRoute ? (
            <button
              onClick={() => onSwitchView(false)}
              className="text-[10px] font-mono text-zinc-400 hover:text-emerald-400 tracking-wider transition-colors duration-200 cursor-pointer uppercase underline"
            >
              🌐 Bonyeza hapa kuingia kama User wa Kawaida
            </button>
          ) : (
            <button
              onClick={() => onSwitchView(true)}
              className="text-[10px] font-mono text-zinc-400 hover:text-yellow-400 tracking-wider transition-colors duration-200 cursor-pointer uppercase underline"
            >
              🔑 Wewe ni Admin? Bonyeza hapa kuingia kama Admin
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
