/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SignalCard } from './components/SignalCard';
import { RequestButton } from './components/RequestButton';
import { SignalHistory } from './components/SignalHistory';
import { AuthScreens } from './components/AuthScreens';
import { UserManagementPanel } from './components/UserManagementPanel';
import { SignalMode, SignalRequest, AppUser } from './types';
import { getNextSignalTime } from './utils/signalHelper';
import { synth } from './utils/audio';
import { 
  Volume2, 
  VolumeX, 
  Activity, 
  Battery,
  LogOut,
  Users,
  ShieldAlert,
  UserCheck2,
  Clock
} from 'lucide-react';

const DEFAULT_USERS: AppUser[] = [
  {
    id: 'admin-node-1',
    name: 'System Admin',
    phone: '0743288942',
    password: 'Examplejr17',
    isApproved: true,
    role: 'admin',
    registeredAt: '2026-06-04 12:00'
  },
  {
    id: 'member-1',
    name: 'Ramadhan Salum',
    phone: '0712345678',
    password: 'password',
    isApproved: false, // Default is false so they can experience the Admin Approving process!
    role: 'user',
    registeredAt: '2026-06-04 20:55'
  },
  {
    id: 'member-2',
    name: 'Juma Jux',
    phone: '0788112233',
    password: 'password',
    isApproved: true,
    role: 'user',
    registeredAt: '2026-06-04 15:45'
  }
];

export default function App() {
  // Main states
  const [currentMode, setCurrentMode] = useState<SignalMode>(() => {
    const saved = localStorage.getItem('pilot_mode');
    return (saved as SignalMode) || 'SCHEDULE';
  });

  const [activeSignal, setActiveSignal] = useState<string | null>(() => {
    return localStorage.getItem('pilot_active_signal');
  });

  const [statusText, setStatusText] = useState<string>(() => {
    return localStorage.getItem('pilot_status_text') || 'READY';
  });

  const [logs, setLogs] = useState<SignalRequest[]>(() => {
    const saved = localStorage.getItem('pilot_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // User database & session authentication states
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('pilot_registered_users');
    let usersList = saved ? JSON.parse(saved) : DEFAULT_USERS;
    
    // Safety Force sanitization: search if any user has role 'admin', and force coordinates
    const adminIndex = usersList.findIndex((u: AppUser) => u.role === 'admin');
    if (adminIndex !== -1) {
      usersList[adminIndex] = {
        ...usersList[adminIndex],
        phone: '0743288942',
        password: 'Examplejr17',
        name: 'System Admin',
        isApproved: true
      };
    } else {
      usersList.push({
        id: 'admin-node-1',
        name: 'System Admin',
        phone: '0743288942',
        password: 'Examplejr17',
        isApproved: true,
        role: 'admin',
        registeredAt: '2026-06-04 12:00'
      });
    }
    return usersList;
  });

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('pilot_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isAdminView, setIsAdminView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'admin' || params.get('role') === 'admin';
  });

  const handleSwitchView = (isAdmin: boolean) => {
    synth.playClick();
    setIsAdminView(isAdmin);
    const newUrl = isAdmin 
      ? `${window.location.pathname}?view=admin`
      : `${window.location.pathname}?view=user`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setIsAdminView(params.get('view') === 'admin' || params.get('role') === 'admin');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Show User management Admin overlay state
  const [showMemberManagement, setShowMemberManagement] = useState(false);

  // Audio mute toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // System real-time clock state
  const [systemTime, setSystemTime] = useState(() => {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  });

  // Calculation animation trigger state
  const [isGenerating, setIsGenerating] = useState(false);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setSystemTime(d.toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync states to local storage
  useEffect(() => {
    localStorage.setItem('pilot_mode', currentMode);
  }, [currentMode]);

  useEffect(() => {
    if (activeSignal) {
      localStorage.setItem('pilot_active_signal', activeSignal);
    } else {
      localStorage.removeItem('pilot_active_signal');
    }
  }, [activeSignal]);

  useEffect(() => {
    localStorage.setItem('pilot_status_text', statusText);
  }, [statusText]);

  useEffect(() => {
    localStorage.setItem('pilot_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('pilot_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pilot_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pilot_current_user');
    }
  }, [currentUser]);

  // Keep the current user state fully synchronized with the database in case of Admin actions (approvals)
  useEffect(() => {
    if (currentUser) {
      const freshUserData = registeredUsers.find(u => u.id === currentUser.id);
      if (freshUserData && JSON.stringify(freshUserData) !== JSON.stringify(currentUser)) {
        setCurrentUser(freshUserData);
      }
    }
  }, [registeredUsers, currentUser]);

  // Request Button Trigger Handler with realistic tactical vector delay
  const handleRequestSignal = () => {
    // SECURITY GUARD: Check registered and approved
    if (!currentUser) {
      synth.playError();
      return;
    }
    
    if (!currentUser.isApproved && currentUser.role !== 'admin') {
      synth.playError();
      setStatusText('UNAUTHORIZED');
      return;
    }

    setIsGenerating(true);
    setStatusText('CALCULATING...');

    setTimeout(() => {
      const { signalTime, message } = getNextSignalTime(systemTime, currentMode);
      
      const d = new Date();
      const currentFormattedTime = d.toTimeString().split(' ')[0];

      if (signalTime) {
        setActiveSignal(signalTime);
        setStatusText('READY');
        if (soundEnabled) synth.playSuccess();

        // Save historical dispatch entry
        const newLog: SignalRequest = {
          id: crypto.randomUUID(),
          timestamp: currentFormattedTime,
          signalTime,
          mode: currentMode,
          status: 'READY'
        };
        setLogs(prev => [newLog, ...prev].slice(0, 50));
      } else {
        setActiveSignal(null);
        setStatusText(message);
        if (soundEnabled) synth.playError();

        // Save failed entry
        const newLog: SignalRequest = {
          id: crypto.randomUUID(),
          timestamp: currentFormattedTime,
          signalTime: '--:--:--',
          mode: currentMode,
          status: 'FINISHED'
        };
        setLogs(prev => [newLog, ...prev].slice(0, 50));
      }

      setIsGenerating(false);
    }, 800);
  };

  // User Actions handlers
  const handleRegisterUser = (name: string, phone: string, password: string) => {
    const newUser: AppUser = {
      id: 'member-' + Date.now(),
      name,
      phone,
      password,
      isApproved: false, // Default to FALSE. Admin must approve before they generate signals!
      role: 'user',
      registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setRegisteredUsers(prev => [...prev, newUser]);
    // Auto login immediately
    setCurrentUser(newUser);
  };

  const handleToggleApproval = (userId: string) => {
    setRegisteredUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          return { ...u, isApproved: !u.isApproved };
        }
        return u;
      })
    );
  };

  const handleDeleteUser = (userId: string) => {
    setRegisteredUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleAddSimulatedUser = (name: string, phone: string, isApproved: boolean) => {
    const testUser: AppUser = {
      id: 'member-sim-' + Date.now() + Math.random().toString(36).substr(2, 4),
      name,
      phone,
      password: 'password',
      isApproved,
      role: 'user',
      registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setRegisteredUsers(prev => [...prev, testUser]);
  };

  const handleLogout = () => {
    synth.playClick();
    setCurrentUser(null);
    setShowMemberManagement(false);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const getModeLabelForDisplay = () => {
    switch (currentMode) {
      case 'SCHEDULE': return 'SCHEDULE LIST';
      case 'INTERVAL_3': return 'INTERVAL MODE 1 (3 MIN)';
      case 'INTERVAL_5': return 'INTERVAL MODE 2 (5 MIN)';
      case 'INTERVAL_10': return 'INTERVAL MODE 3 (10 MIN)';
    }
  };

  const pendingCount = registeredUsers.filter(u => !u.isApproved).length;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-center items-center py-8 px-4 selection:bg-[#39FF14] selection:text-black relative overflow-hidden">
      
      {/* Absolute Silver Glow Background Effect */}
      <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[250%] sm:w-[800px] h-[400px] sm:h-[600px] bg-[#c0c0c010] rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

      {/* Main Bezel Container */}
      <div className="w-full max-w-lg rounded-[48px] bg-[#020502]/95 border-2 border-[#C0C0C020] p-6 sm:p-10 flex flex-col items-center justify-between relative shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_50px_rgba(0,100,0,0.1)] overflow-hidden z-10">
        
        {/* Real-time Status bar overlay */}
        <div className="w-full flex justify-between items-center px-2 pb-5 mb-6 border-b border-white/5 text-[10px] font-mono text-metallic-silver/50 z-20">
          <div className="flex items-center gap-1.5 font-bold tracking-widest text-[9px] text-[#39FF14]">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>PILOT_OS SECURE PRO</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[#39FF14] animate-ping duration-[3s]">●</span>
              <span>{currentUser ? currentUser.name.split(' ')[0].toUpperCase() : 'ANONYMOUS'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Battery className="w-3.5 h-3.5 text-metallic-silver/60" />
            </div>
          </div>
        </div>

        {/* Global Toolbar overlay controls (Sound, Logout) */}
        <div className="absolute top-20 sm:top-24 right-8 z-30 flex items-center gap-2">
          <button
            onClick={() => {
              synth.playClick();
              setSoundEnabled(!soundEnabled);
            }}
            className="p-2 rounded-full border border-white/5 bg-black/60 hover:bg-[#003300]/40 hover:border-[#C0C0C040] transition-all text-metallic-silver hover:text-white cursor-pointer"
            title={soundEnabled ? 'Mute Interface Sound' : 'Unmute Interface Sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#39FF14]" /> : <VolumeX className="w-3.5 h-3.5 text-red-500" />}
          </button>

          {currentUser && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-full border border-red-500/10 bg-black/65 hover:bg-red-950/20 hover:border-red-500/40 text-red-400 hover:text-red-300 transition-all cursor-pointer"
              title="Log Out (Toka)"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* HEADER SECTION */}
        <header className="flex flex-col items-center text-center mt-2 w-full z-10 mb-2">
          {/* Premium Shield Logo block */}
          <div className="mb-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-[#C0C0C0] rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#006400] to-black shadow-[0_0_20px_rgba(192,192,192,0.3)]">
              <svg width="45" height="45" sm:width="60" sm:height="60" viewBox="0 0 24 24" fill="none" stroke="#C0C0C0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/>
                <path d="M12 11l-3 2v2l3-1l3 1v-2l-3-2z"/>
              </svg>
            </div>
          </div>

          <h1 className="text-[#C0C0C0] text-3xl sm:text-4xl font-bold tracking-[0.4em] mb-2 uppercase select-none font-display">
            Pilot Site
          </h1>

          <p className="text-2xl sm:text-3xl font-black tracking-wider select-none font-display animate-header-gradient italic">
            SPORTYBET SIGNAL
          </p>

          <div className="h-[2px] w-40 sm:w-48 bg-gradient-to-r from-transparent via-[#C0C0C0]/50 to-transparent mt-3"></div>
        </header>

        {/* CONDITIONAL APP RENDER SCHEDULER */}
        <AnimatePresence mode="wait">
          {!currentUser ? (
            /* SCENARIO A: Authenticate Screen overlay */
            <motion.div
              key="auth-portal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="w-full mt-6"
            >
              <AuthScreens
                onLoginSuccess={setCurrentUser}
                registeredUsers={registeredUsers}
                onRegisterUser={handleRegisterUser}
                isAdminRoute={isAdminView}
                onSwitchView={handleSwitchView}
              />
            </motion.div>
          ) : showMemberManagement && currentUser.role === 'admin' ? (
            /* SCENARIO B: Admin User Approvals directory override view */
            <motion.div
              key="member-management"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full mt-6 z-20"
            >
              <UserManagementPanel
                users={registeredUsers}
                onToggleApproval={handleToggleApproval}
                onDeleteUser={handleDeleteUser}
                onAddSimulatedUser={handleAddSimulatedUser}
                onClose={() => {
                  synth.playClick();
                  setShowMemberManagement(false);
                }}
              />
            </motion.div>
          ) : !currentUser.isApproved && currentUser.role !== 'admin' ? (
            /* SCENARIO C: Registered but waiting for Admin Approval status screen */
            <motion.div
              key="pending-bezel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full mt-6 text-center animate-pulse"
            >
              <div className="bg-[#00640003] backdrop-blur-xl border border-yellow-500 rounded-[32px] p-6 sm:p-8 flex flex-col items-center">
                <div className="p-4 rounded-full bg-yellow-500/10 border border-yellow-500/40 mb-4 animate-bounce">
                  <ShieldAlert className="w-8 h-8 text-yellow-500" />
                </div>

                <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider mb-2">
                  UKURASA WA KUSUBIRI RIDHAA (PENDING APPROVAL)
                </h3>

                <p className="text-zinc-300 text-xs leading-relaxed mb-6">
                  Habari <strong className="text-[#39FF14]">{currentUser.name}</strong>, akaunti yako imesajiliwa kikamilifu kwenye namba <strong className="text-white">{currentUser.phone}</strong>. Ili kuanza kuingia na kutumia huduma ya Sportybet Signal, <strong>Mr. Example</strong> anapaswa kuidhinisha (Approve) namba yako kwanza.
                </p>

                <div className="p-4 bg-black/60 border border-white/5 rounded-2xl w-full text-left space-y-2.5 mb-6">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-500">JINA LA USER:</span>
                    <span className="text-[#C0C0C0] uppercase font-bold">{currentUser.name}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-500">NAMBA YA SIMU:</span>
                    <span className="text-[#39FF14] font-bold">{currentUser.phone}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-500">HALI (STATUS):</span>
                    <span className="text-yellow-400 font-bold uppercase animate-pulse">HAJAENDA APPROVED ❌</span>
                  </div>
                </div>

                {/* Direct WhatsApp Action Link so User contacts Admin to get approved immediately */}
                <span className="text-[10px] font-mono text-zinc-400 tracking-wider block mb-2 font-bold uppercase">
                  👇 BONYEZA KITUFE HIKI KUMTUMIA ADMIN MAOMBI YA KIBALI 👇
                </span>
                
                <a
                  href={`https://wa.me/255743288942?text=${encodeURIComponent(
                    `Habari Mr. Example, nimejiunga kwenye Sportybet Signal App.\n\nTaarifa zangu ni:\nJina langu: ${currentUser.name}\nNamba yangu ya simu: ${currentUser.phone}\n\nTafadhali ni-approve (nipitishe) nianze kutumia mfumo wako wa signals.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => synth.playSuccess()}
                  className="w-full py-4 mb-6 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 border border-white/20 text-white text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 mt-1 shadow-[0_4px_20px_rgba(34,197,94,0.3)] hover:scale-[1.02] transform transition-all duration-300"
                >
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>OMBA KIBALI KUTOKA KWA MR. EXAMPLE</span>
                </a>

                {/* Demonstration Alert Tip */}
                <div className="text-[10px] bg-neutral-950 border border-white/5 rounded-xl p-3 text-center text-zinc-400 leading-normal mb-6 max-w-xs">
                  💡 <strong>Kumbuka:</strong> Baada ya kutuma ujumbe huo WhatsApp, <strong>Mr. Example</strong> ataingia upande wa Admin na kupitisha (Approve) akaunti yako papo hapo.
                </div>

                <button
                  onClick={handleLogout}
                  className="px-6 py-2.5 rounded-full border border-red-500/30 bg-red-950/20 text-red-400 font-mono text-xs uppercase hover:text-white hover:bg-red-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  <span>Toka (Logout)</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* SCENARIO D: Fully approved dashboard flow */
            <motion.div
              key="dashboard-app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center"
            >
              {/* Logged in notification pill with admin member directory panel launch badge */}
              <div className="w-full py-2.5 px-4 bg-black/50 border border-white/5 rounded-2xl flex items-center justify-between text-xs mb-2 z-10 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-zinc-400 font-mono text-[10px]">
                    PILOT: <strong className="text-white uppercase">{currentUser.name.split(' ')[0]}</strong>
                  </span>
                </div>

                {currentUser.role === 'admin' ? (
                  /* Admin controls link */
                  <button
                    onClick={() => {
                      synth.playClick();
                      setShowMemberManagement(true);
                    }}
                    className="px-3 py-1 bg-gradient-to-r from-green-900 to-[#004d00]/70 border border-green-500/30 hover:border-green-400 rounded-lg text-[9px] uppercase font-mono tracking-wider font-bold text-white flex items-center gap-1.5 cursor-pointer relative"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>MEMBER DIRECTORY</span>
                    {pendingCount > 0 && (
                      <span className="h-2 w-2 rounded-full bg-yellow-500 absolute -top-1 -right-0.5 animate-bounce" />
                    )}
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-zinc-900 text-emerald-400 border border-emerald-500/10 text-[9px] font-mono uppercase tracking-wider">
                    APPROVED MEMBER ✔
                  </span>
                )}
              </div>

              {/* MAIN CALCULATION DISPLAY */}
              <section className="w-full flex flex-col items-center mt-2 z-10">
                <SignalCard
                  signalTime={activeSignal}
                  statusText={statusText}
                  isGenerating={isGenerating}
                  modeLabel={getModeLabelForDisplay()}
                  systemClock={systemTime}
                />

                <RequestButton
                  onTrigger={handleRequestSignal}
                  disabled={isGenerating}
                />
              </section>

              {/* HISTORICAL TRANSMISSIONS */}
              <section className="w-full z-10">
                <SignalHistory
                  logs={logs}
                  onClear={handleClearLogs}
                />
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Moving Ticker Banner with medium-sized "Mr. Example" text */}
        <div className="w-full mt-6 py-2 bg-gradient-to-r from-emerald-950/10 via-[#006400]/20 to-emerald-950/10 border-y border-[#C0C0C030] overflow-hidden relative z-10">
          <marquee scrollamount="5" className="block w-full font-display font-black text-sm sm:text-base tracking-[0.35em] text-[#39FF14] select-none uppercase">
            MR. EXAMPLE &nbsp;&bull;&nbsp; MR. EXAMPLE &nbsp;&bull;&nbsp; MR. EXAMPLE &nbsp;&bull;&nbsp; MR. EXAMPLE &nbsp;&bull;&nbsp; MR. EXAMPLE &nbsp;&bull;&nbsp; MR. EXAMPLE &nbsp;&bull;&nbsp; MR. EXAMPLE
          </marquee>
        </div>

        {/* FOOTER */}
        <footer className="w-full mt-8 pt-5 border-t border-white/5 flex flex-col items-center gap-1.5 z-10">
          <p className="text-[#C0C0C0] text-[10px] sm:text-xs font-light tracking-[0.4em] opacity-40 uppercase font-display">
            PILOT SITE © 2026 • PREMIUM SIGNAL SYSTEM
          </p>
        </footer>

      </div>

      {/* Responsive Decorative bottom-corner system specs overlay columns */}
      <div className="hidden lg:block absolute bottom-10 left-10 text-[8.5px] font-mono text-[#006400] leading-relaxed opacity-40 select-none">
        SECURE_LINK_ACTIVE: TRUE<br/>
        ENCRYPTION_LEVEL: AES-256<br/>
        SIGNAL_NODE: ALPHA_9
      </div>
      
      <div className="hidden lg:block absolute bottom-10 right-10 text-[8.5px] font-mono text-[#006400] leading-relaxed text-right opacity-40 select-none">
        LATENCY: 14MS<br/>
        ACCURACY_RATING: 98.4%<br/>
        SYSTEM_STABLE: ONLINE
      </div>

    </div>
  );
}
