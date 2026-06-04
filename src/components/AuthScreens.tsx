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
  onRegisterUser: (name: string, phone: string, password: string) => void;
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
  
  // Forms state
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
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
    setPassword('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
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
        setErrorMsg(`UMEZUIWA: Umeingiza taarifa zisizo sahihi mara 3. Subiri dakika ${mins}:${secs < 10 ? '0' : ''}${secs} kabla ya kujaribu tena!`);
        return;
      }
    }

    if (!phone || !password) {
      synth.playError();
      setErrorMsg('Tafadhali jaza namba ya simu na password.');
      return;
    }

    if (isAdminRoute) {
      // Admin exclusive validation rule
      if (phone.trim() === '0743288942' && password === 'Examplejr17') {
        const adminUser = registeredUsers.find(u => u.phone === '0743288942');
        localStorage.removeItem('pilot_failed_attempts');
        localStorage.removeItem('pilot_lockout_time');
        synth.playSuccess();
        if (adminUser) {
          onLoginSuccess(adminUser);
        } else {
          // Safety fallback if database was cleared
          onLoginSuccess({
            id: 'admin-node-1',
            name: 'System Admin',
            phone: '0743288942',
            password: 'Examplejr17',
            isApproved: true,
            role: 'admin',
            registeredAt: '2026-06-04 12:00'
          });
        }
      } else {
        synth.playError();
        const currentFailures = Number(localStorage.getItem('pilot_failed_attempts') || '0') + 1;
        localStorage.setItem('pilot_failed_attempts', String(currentFailures));

        if (currentFailures >= 3) {
          const lockoutUntil = Date.now() + 60 * 60 * 1000;
          localStorage.setItem('pilot_lockout_time', String(lockoutUntil));
          setLockoutTimeLeft(3600);
          setErrorMsg('WARNING: Umeingiza namba au password isiyo sahihi mara 3! Umezuiwa (lockout) kutumia mfumo kwa muda wa saa 1 (lisaa limoja).');
        } else {
          const attemptsLeft = 3 - currentFailures;
          setErrorMsg(`Namba ya simu au password isiyo sahihi kwa Admin! Una nafasi ${attemptsLeft} zaidi za kujaribu kabla ya kuzuiliwa kwa saa 1.`);
        }
      }
    } else {
      // Normal User Login validation rule
      const foundUser = registeredUsers.find(
        u => u.phone.trim() === phone.trim() && u.password === password
      );

      if (foundUser) {
        localStorage.removeItem('pilot_failed_attempts');
        localStorage.removeItem('pilot_lockout_time');
        synth.playSuccess();
        onLoginSuccess(foundUser);
      } else {
        synth.playError();
        const currentFailures = Number(localStorage.getItem('pilot_failed_attempts') || '0') + 1;
        localStorage.setItem('pilot_failed_attempts', String(currentFailures));

        if (currentFailures >= 3) {
          const lockoutUntil = Date.now() + 60 * 60 * 1000;
          localStorage.setItem('pilot_lockout_time', String(lockoutUntil));
          setLockoutTimeLeft(3600);
          setErrorMsg('WARNING: Umeingiza namba au nenosiri lisilo sahihi mara 3! Umezuiwa (lockout) kutumia mfumo kwa muda wa saa 1 (lisaa limoja).');
        } else {
          const attemptsLeft = 3 - currentFailures;
          setErrorMsg(`Namba ya simu au password isiyo sahihi! Una nafasi ${attemptsLeft} zaidi za kujaribu kabla ya kuzuiliwa kwa saa 1.`);
        }
      }
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name || !phone || !password) {
      synth.playError();
      setErrorMsg('Tafadhali jaza taarifa zote kukamilisha usajili.');
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

    // Check if phone already registered
    const exists = registeredUsers.some(u => u.phone.trim() === phone.trim());
    if (exists) {
      synth.playError();
      setErrorMsg('Namba hii ya simu tayari imesajiliwa.');
      return;
    }

    onRegisterUser(name, phone, password);
    synth.playSuccess();
    setSuccessMsg('Usajili Umefanikiwa kikamilifu! Sasa unaingizwa kwenye kurasa ya kusubiri kibali cha Admin.');
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
    return `Kujaribu kuingia kumezuiliwa! Tafadhali subiri dakika ${mins}:${secs < 10 ? '0' : ''}${secs} hadi lisaa limalizike ili ujaribu tena.`;
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
                {isAdminRoute ? 'Namba ya Simu ya Admin' : 'Namba ya Simu Contacts'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#C0C0C0]/50">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder={isAdminRoute ? 'Mfano: 0743288942' : 'Mfano: 0712345678'}
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
