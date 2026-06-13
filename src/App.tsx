/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SignalCard } from './components/SignalCard';
import { RequestButton } from './components/RequestButton';

import { AuthScreens } from './components/AuthScreens';
import { UserManagementPanel } from './components/UserManagementPanel';
import { InstallModal } from './components/InstallModal';
import { SignalMode, SignalRequest, AppUser, WeeklySignal, AdminUpdate } from './types';
import { getNextSignalTime, timeStringToSeconds } from './utils/signalHelper';
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
  Clock,
  Smartphone,
  Calendar,
  Plane
} from 'lucide-react';

const DEFAULT_USERS: AppUser[] = [
  {
    id: 'admin-node-1',
    name: 'System Admin',
    phone: '0743288942',
    password: 'Examplejr17',
    isApproved: true,
    isSuspended: false,
    role: 'admin',
    registeredAt: '2026-06-04 12:00',
    status: 'Approved'
  }
];

const generateSafeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // ignore
    }
  }
  return 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
};

export default function App() {
  // Main states
  const [currentMode, setCurrentMode] = useState<SignalMode>(() => {
    const saved = localStorage.getItem('pilot_mode');
    return (saved as SignalMode) || 'SCHEDULE';
  });

  const [isInstallOpen, setIsInstallOpen] = useState(false);

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
    try {
      const saved = localStorage.getItem('pilot_registered_users');
      return saved ? JSON.parse(saved) : DEFAULT_USERS;
    } catch (e) {
      return DEFAULT_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('pilot_current_user');
    const lastActive = localStorage.getItem('pilot_last_active');
    
    if (saved && lastActive) {
      const diffMs = Date.now() - Number(lastActive);
      const limitMs = 35 * 60 * 1000; // 35 minutes in milliseconds
      if (diffMs > limitMs) {
        // Expired! Clear so they have to input password again
        localStorage.removeItem('pilot_current_user');
        localStorage.removeItem('pilot_last_active');
        return null;
      }
    }
    
    if (saved) {
      localStorage.setItem('pilot_last_active', String(Date.now()));
    }
    
    return saved ? JSON.parse(saved) : null;
  });

  const [weeklySignals, setWeeklySignals] = useState<WeeklySignal[]>(() => {
    try {
      const saved = localStorage.getItem('pilot_weekly_signals');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [adminUpdates, setAdminUpdates] = useState<AdminUpdate[]>(() => {
    try {
      const saved = localStorage.getItem('pilot_admin_updates');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const resilientFetch = async (url: string, options?: RequestInit, retries = 3, delay = 1000): Promise<Response> => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res;
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return resilientFetch(url, options, retries - 1, delay * 1.5);
      }
      throw err;
    }
  };

  const fetchWeeklySignals = () => {
    resilientFetch('/api/weekly-signals')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setWeeklySignals(data);
          localStorage.setItem('pilot_weekly_signals', JSON.stringify(data));
        }
      })
      .catch(err => console.warn('Retrying/failed fetching weekly signals:', err));
  };

  const fetchAdminUpdates = () => {
    resilientFetch('/api/admin-updates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAdminUpdates(data);
          localStorage.setItem('pilot_admin_updates', JSON.stringify(data));
        }
      })
      .catch(err => console.warn('Retrying/failed fetching admin updates:', err));
  };

  const handleSaveWeeklySignal = async (sig: Partial<WeeklySignal>) => {
    try {
      const response = await fetch('/api/weekly-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sig)
      });
      if (response.ok) {
        fetchWeeklySignals();
        synth.playSuccess();
      } else {
        throw new Error('Failed to save weekly signal');
      }
    } catch (err) {
      console.error(err);
      synth.playError();
      alert('Imeshindwa kuhifadhi signal ya wiki.');
    }
  };

  const handleSaveAdminUpdate = async (upd: Partial<AdminUpdate>) => {
    try {
      const response = await fetch('/api/admin-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(upd)
      });
      if (response.ok) {
        fetchAdminUpdates();
        synth.playSuccess();
      } else {
        throw new Error('Failed to save admin update');
      }
    } catch (err) {
      console.error(err);
      synth.playError();
      alert('Imeshindwa kuhifadhi update ya admin.');
    }
  };

  const handleDeleteWeeklySignal = async (id: string) => {
    try {
      const response = await fetch('/api/weekly-signals/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        fetchWeeklySignals();
        synth.playSuccess();
      } else {
        throw new Error('Failed to delete weekly signal');
      }
    } catch (err) {
      console.error(err);
      synth.playError();
      alert('Imeshindwa kufuta signal ya wiki.');
    }
  };

  const handleDeleteAdminUpdate = async (id: string) => {
    try {
      const response = await fetch('/api/admin-updates/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        fetchAdminUpdates();
        synth.playSuccess();
      } else {
        throw new Error('Failed to delete admin update');
      }
    } catch (err) {
      console.error(err);
      synth.playError();
      alert('Imeshindwa kufuta update ya admin.');
    }
  };

  const fetchRequests = () => {
    if (!currentUser) return;
    // Admin gets all requests, regular user gets only their own requests
    const queryParam = currentUser.role === 'admin' ? '' : `?phone=${encodeURIComponent(currentUser.phone)}`;
    resilientFetch(`/api/requests${queryParam}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLogs(data);
        }
      })
      .catch(err => console.warn('Retrying/failed fetching logs:', err));
  };

  const fetchUsers = () => {
    resilientFetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRegisteredUsers(data);
        }
      })
      .catch(err => console.warn('Retrying/failed fetching users:', err));
  };

  // Poll notifications / users / requests in real-time
  useEffect(() => {
    if (currentUser) {
      fetchRequests();
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUsers();
    fetchWeeklySignals();
    fetchAdminUpdates();
    const interval = setInterval(() => {
      fetchUsers();
      fetchWeeklySignals();
      fetchAdminUpdates();
      if (currentUser) {
        fetchRequests();
      }
    }, 4000); // Poll every 4 seconds to catch approvals and requests in real-time
    return () => clearInterval(interval);
  }, [currentUser]);


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

  // Welcome modal for newly or already approved users
  const [showApprovedWelcomeModal, setShowApprovedWelcomeModal] = useState(false);

  // Audio mute toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [playedAviatorOnLoad, setPlayedAviatorOnLoad] = useState(() => {
    return !!sessionStorage.getItem('pilot_played_aviator_v1');
  });

  useEffect(() => {
    if (currentUser && !playedAviatorOnLoad) {
      const playOnFirstInteraction = () => {
        if (soundEnabled) {
          synth.playAviatorCrash();
        }
        setPlayedAviatorOnLoad(true);
        sessionStorage.setItem('pilot_played_aviator_v1', 'true');
        
        window.removeEventListener('click', playOnFirstInteraction);
        window.removeEventListener('touchstart', playOnFirstInteraction);
      };
      
      window.addEventListener('click', playOnFirstInteraction);
      window.addEventListener('touchstart', playOnFirstInteraction);
      
      return () => {
        window.removeEventListener('click', playOnFirstInteraction);
        window.removeEventListener('touchstart', playOnFirstInteraction);
      };
    }
  }, [currentUser, playedAviatorOnLoad, soundEnabled]);

  // System real-time clock state
  const [systemTime, setSystemTime] = useState(() => {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  });

  // Calculation animation trigger state
  const [isGenerating, setIsGenerating] = useState(false);

  // Update clock every second and check for signal expiration
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      const formatted = d.toTimeString().split(' ')[0];
      setSystemTime(formatted);

      // Transition to FINISHED state once current time has passed the scheduled signal by at least 5 minutes (300 seconds)
      if (activeSignal && statusText === 'READY') {
        const sysSecs = timeStringToSeconds(formatted);
        const sigSecs = timeStringToSeconds(activeSignal);
        let diffSecs = sysSecs - sigSecs;
        if (diffSecs < -43200) diffSecs += 86400;
        else if (diffSecs > 43200) diffSecs -= 86400;

        if (diffSecs >= 300) {
          setStatusText('FINISHED');
          localStorage.setItem('pilot_finished_at', String(Date.now()));
        }
      } else if (statusText === 'FINISHED') {
        const finishedAt = localStorage.getItem('pilot_finished_at');
        if (finishedAt) {
          const diffMs = Date.now() - Number(finishedAt);
          if (diffMs >= 3 * 60 * 1000) {
            setStatusText('IDLE');
            setActiveSignal(null);
            localStorage.removeItem('pilot_finished_at');
            localStorage.removeItem('pilot_active_signal');
          }
        } else {
          localStorage.setItem('pilot_finished_at', String(Date.now()));
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSignal, statusText]);

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

  // Keep the current user state fully synchronized with the database in case of Admin actions (approvals / suspensions)
  useEffect(() => {
    if (currentUser) {
      // Try to find by ID first, then by phone number as a fallback
      let freshUserData = registeredUsers.find(u => u.id === currentUser.id);
      if (!freshUserData && currentUser.role === 'user') {
        freshUserData = registeredUsers.find(u => u.phone.trim() === currentUser.phone.trim());
      }

      if (freshUserData) {
        // Detect transition from pending (false) to approved (true) in real-time
        if (freshUserData.isApproved && !currentUser.isApproved) {
          if (soundEnabled) {
            synth.playSuccess();
          }
          setShowApprovedWelcomeModal(true);
        }

        // Keep local state in sync based on direct field changes
        if (
          freshUserData.isApproved !== currentUser.isApproved ||
          freshUserData.isSuspended !== currentUser.isSuspended ||
          freshUserData.status !== currentUser.status ||
          freshUserData.name !== currentUser.name
        ) {
          setCurrentUser(freshUserData);
        }
      }
    }
  }, [registeredUsers, currentUser, soundEnabled]);

  // Check on load/login if already approved but not seen welcome popup yet
  useEffect(() => {
    if (currentUser && currentUser.isApproved && currentUser.role !== 'admin') {
      const shownKey = `pilot_welcome_shown_v3_${currentUser.id}`;
      const alreadyShown = localStorage.getItem(shownKey);
      if (!alreadyShown) {
        setShowApprovedWelcomeModal(true);
        localStorage.setItem(shownKey, 'true');
      }
    }
  }, [currentUser]);

  // Sync user activity time when interacted to remember them for up to 35 minutes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pilot_last_active', String(Date.now()));

      const handleUserActivity = () => {
        localStorage.setItem('pilot_last_active', String(Date.now()));
      };

      // Register activity tracking listeners
      window.addEventListener('click', handleUserActivity);
      window.addEventListener('keydown', handleUserActivity);
      window.addEventListener('touchstart', handleUserActivity, { passive: true });
      window.addEventListener('pointerdown', handleUserActivity, { passive: true });
      window.addEventListener('scroll', handleUserActivity, { passive: true });

      // Inactivity checker execution loop (runs every 15 seconds)
      const idleChecker = setInterval(() => {
        const last = localStorage.getItem('pilot_last_active');
        if (last) {
          const diff = Date.now() - Number(last);
          if (diff > 35 * 60 * 1000) {
            handleLogout();
          }
        }
      }, 15000);

      return () => {
        window.removeEventListener('click', handleUserActivity);
        window.removeEventListener('keydown', handleUserActivity);
        window.removeEventListener('touchstart', handleUserActivity);
        window.removeEventListener('pointerdown', handleUserActivity);
        window.removeEventListener('scroll', handleUserActivity);
        clearInterval(idleChecker);
      };
    }
  }, [currentUser]);

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

    if (currentUser.isSuspended) {
      synth.playError();
      setStatusText('SUSPENDED');
      return;
    }

    setIsGenerating(true);
    setStatusText('CALCULATING...');
    localStorage.removeItem('pilot_finished_at');

    setTimeout(() => {
      const { signalTime, message } = getNextSignalTime(systemTime, currentMode);
      
      const d = new Date();
      const currentFormattedTime = d.toTimeString().split(' ')[0];

      if (signalTime) {
        setActiveSignal(signalTime);
        setStatusText('READY');
        if (soundEnabled) synth.playSuccess();

        const newLog: SignalRequest = {
          id: generateSafeId(),
          timestamp: currentFormattedTime,
          signalTime,
          mode: currentMode,
          status: 'READY',
          userId: currentUser.id,
          userName: currentUser.name,
          userPhone: currentUser.phone
        };

        // Persist to backend database
        fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLog)
        })
          .then(async res => {
            if (res.ok) {
              fetchRequests();
            } else {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'Ombi la kupata signal limekataliwa na server');
            }
          })
          .catch(err => {
            console.error('Failed to save log to server:', err);
            setLogs(prev => [newLog, ...prev].slice(0, 50));
            setStatusText('UNAUTHORIZED');
            if (soundEnabled) synth.playError();
            fetchUsers(); // Automatically trigger user sync to lock/unlock instantly
          });
      } else {
        setActiveSignal(null);
        setStatusText(message);
        if (soundEnabled) synth.playError();

        const newLog: SignalRequest = {
          id: generateSafeId(),
          timestamp: currentFormattedTime,
          signalTime: '--:--:--',
          mode: currentMode,
          status: 'FINISHED',
          userId: currentUser.id,
          userName: currentUser.name,
          userPhone: currentUser.phone
        };

        // Persist to backend database
        fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLog)
        })
          .then(async res => {
            if (res.ok) {
              fetchRequests();
            } else {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'Ombi la kupata signal limekataliwa na server');
            }
          })
          .catch(err => {
            console.error('Failed to save log to server:', err);
            setLogs(prev => [newLog, ...prev].slice(0, 50));
            setStatusText('UNAUTHORIZED');
            if (soundEnabled) synth.playError();
            fetchUsers();
          });
      }

      setIsGenerating(false);
    }, 800);
  };

  // User Actions handlers
  const handleRegisterUser = (newUser: AppUser) => {
    fetchUsers();
    setCurrentUser(newUser);
  };

  const handleToggleApproval = (userId: string, isApprovedState?: boolean, isSuspendedState?: boolean, statusState?: 'Pending' | 'Approved' | 'Rejected' | 'Suspended') => {
    const userToToggle = registeredUsers.find(u => u.id === userId);
    if (!userToToggle) return;

    // Resolve final status of the user
    let finalStatus = statusState;
    let finalApproved = isApprovedState !== undefined ? isApprovedState : !userToToggle.isApproved;
    let finalSuspended = isSuspendedState !== undefined ? isSuspendedState : !!userToToggle.isSuspended;

    if (finalStatus !== undefined) {
      finalApproved = finalStatus === 'Approved';
      finalSuspended = finalStatus === 'Suspended';
    } else {
      // derive status
      finalStatus = finalSuspended ? 'Suspended' : finalApproved ? 'Approved' : 'Pending';
    }

    // Optimistic UI state update
    setRegisteredUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, isApproved: finalApproved, isSuspended: finalSuspended, status: finalStatus as any } : u))
    );

    fetch('/api/users/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status: finalStatus, isApproved: finalApproved, isSuspended: finalSuspended })
    })
      .then(res => {
        if (!res.ok) throw new Error('Request error');
        fetchUsers();
      })
      .catch(err => {
        console.error('Error toggling approval status:', err);
        fetchUsers();
      });
  };

  const handleDeleteUser = (userId: string) => {
    // Optimistic UI state update
    setRegisteredUsers(prev => prev.filter(u => u.id !== userId));

    fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
      .then(res => {
        if (!res.ok) throw new Error('Request error');
        fetchUsers();
      })
      .catch(err => {
        console.error('Error deleting user:', err);
        fetchUsers();
      });
  };

  const handleLogout = () => {
    synth.playClick();
    setCurrentUser(null);
    setShowMemberManagement(false);
  };

  const handleClearLogs = () => {
    setLogs([]);
    fetch('/api/requests/clear', {
      method: 'POST'
    })
      .then(res => {
        if (res.ok) fetchRequests();
      })
      .catch(err => console.error('Failed to clear requests:', err));
  };

  const getModeLabelForDisplay = () => {
    return 'AUTOMATIC SIGNAL ENGINE';
  };

  const pendingCount = registeredUsers.filter(u => !u.isApproved && !u.isSuspended).length;

  // Expiration Check (miaka mitatu mpaka mwezi wa 12 mwaka 2029)
  const isExpired = Date.now() > new Date('2029-12-31T23:59:59').getTime();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-center items-center py-8 px-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[20%] left-[50%] translate-x-[-50%] w-[350px] h-[350px] bg-red-650/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-md rounded-[32px] bg-[#020202] border border-red-500/20 p-8 flex flex-col items-center justify-center text-center relative shadow-2xl z-10">
          <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center mb-6 text-red-500">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>

          <h1 className="text-2xl font-black tracking-wider uppercase mb-1 font-display animate-pulse text-red-500 italic">
            LESENI IMEKWISHA
          </h1>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-6">
            Muda wa Huduma Umefikia Kikomo
          </p>

          <div className="p-5 bg-zinc-950/60 border border-zinc-900 rounded-2xl w-full text-left space-y-3 mb-6 font-mono text-xs text-zinc-300">
            <p className="text-center text-red-400 font-bold mb-2">⚠ MFUMO UMEZUIWA (LOCKED)</p>
            <p><strong>Mwanzo wa Mfumo:</strong> Juni 2026</p>
            <p><strong>Mwisho wa Matumizi:</strong> Desemba 2029 (Miaka 3)</p>
            <p className="text-zinc-400 leading-relaxed pt-2 border-t border-zinc-900">
              Muda wa leseni ya matumizi ya miaka mitatu (3) ya mfumo huu wa Betpawa Signal umemalizika rasmi tarehe 31 Desemba 2029. Toleo hili halitumiki tena.
            </p>
          </div>

          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Tafadhali wasiliana na Admin (<strong>Mr. Example</strong>) ili kuongezewa muda, kupata sasisho thabiti zaidi, au kupata leseni mpya ya matumizi.
          </p>

          <a
            href="https://wa.me/255743288942?text=Habari%20Mr.%20Example%2C%20muda%20wa%20huduma%20ya%20leseni%20yangu%20ya%20Betpawa%20Signal%20umekwisha.%20Tafadhali%20ninaomba%20unisaidie%20kuisajili%20mupya%20au%20kuisogeza%20mbele%20leseni."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 bg-red-950/30 hover:bg-red-650 border border-red-500 hover:text-white text-red-400 rounded-2xl md:rounded-[22px] text-sm font-semibold tracking-wide shadow-lg shadow-red-500/10 hover:shadow-red-500/20 transition-all font-mono uppercase text-center cursor-pointer"
          >
            Wasiliana na Admin (WhatsApp)
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-center items-center py-8 px-4 selection:bg-[#39FF14] selection:text-black relative overflow-hidden">
      
      {/* Absolute Silver Glow Background Effect */}
      <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[250%] sm:w-[800px] h-[400px] sm:h-[600px] bg-[#c0c0c010] rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

      {/* Main Bezel Container */}
      <div className="w-full max-w-lg rounded-[48px] bg-[#020502]/95 border-2 border-[#C0C0C020] p-6 sm:p-10 flex flex-col items-center justify-between relative shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_50px_rgba(0,100,0,0.1)] overflow-hidden z-10">
        
        {/* Real-time Status bar overlay */}
        <div className="w-full flex justify-between items-center px-2 pb-5 mb-6 border-b border-white/5 text-[10px] font-mono text-metallic-silver/50 z-20">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 font-bold tracking-widest text-[9px] text-[#39FF14]">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>PILOT_OS SECURE PRO</span>
            </div>
            <span className="text-[7.5px] font-black uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full tracking-wider select-none animate-pulse">
              Leseni Miaka 3 Aliyopewa (Active 2026 - 2029)
            </span>
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
              setIsInstallOpen(true);
            }}
            className="p-2 rounded-full border border-white/5 bg-black/60 hover:bg-[#003300]/40 hover:border-[#C0C0C040] transition-all text-metallic-silver hover:text-white cursor-pointer"
            title="Sakinisha App / Pakua (Install)"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#39FF14]" />
          </button>

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
              onClick={() => {
                synth.playClick();
                synth.playAviatorCrash();
              }}
              className="p-2 rounded-full border border-[#39FF14]/20 bg-black/60 hover:bg-[#003300]/40 hover:border-[#39FF14] transition-all text-[#39FF14] hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
              title="Sikiliza Mlio wa Ndege (Aviator Sound test)"
            >
              <Plane className="w-3.5 h-3.5 animate-bounce" />
            </button>
          )}

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
            BETPAWA ✈️💫
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
                logs={logs}
                onClearLogs={handleClearLogs}
                weeklySignals={weeklySignals}
                onSaveWeeklySignal={handleSaveWeeklySignal}
                onDeleteWeeklySignal={handleDeleteWeeklySignal}
                adminUpdates={adminUpdates}
                onSaveAdminUpdate={handleSaveAdminUpdate}
                onDeleteAdminUpdate={handleDeleteAdminUpdate}
                onClose={() => {
                  synth.playClick();
                  setShowMemberManagement(false);
                }}
              />
            </motion.div>
          ) : (!currentUser.isApproved || currentUser.isSuspended) && currentUser.role !== 'admin' ? (
            /* SCENARIO C: Registered but waiting for Admin Approval OR Suspended status screen */
            <motion.div
              key="pending-bezel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full mt-6 text-center"
            >
              {currentUser.isSuspended ? (
                /* SUSPENDED SCREEN - RED STYLING */
                <div className="bg-[#5a00000a] backdrop-blur-xl border border-red-500 rounded-[32px] p-6 sm:p-8 flex flex-col items-center">
                  <div className="p-4 rounded-full bg-red-500/10 border border-red-500/40 mb-4 animate-pulse">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                  </div>

                  <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider mb-2">
                    AKAUNTI YAKO IMESITISHWA KWA MUDA! ❌
                  </h3>

                  <p className="text-zinc-300 text-xs leading-relaxed mb-6">
                    Habari <strong className="text-red-500">{currentUser.name}</strong>, huduma yako ya signals kwenye namba <strong className="text-white">{currentUser.phone}</strong> imesitishwa kutumika kwa sasa na Admin (<strong>Mr. Example</strong>). Ili kuirejesha na kuendelea kupata signals, wasiliana na Admin.
                  </p>

                  <div className="p-4 bg-black/60 border border-white/5 rounded-2xl w-full text-left space-y-2.5 mb-6">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-zinc-500">JINA LA USER:</span>
                      <span className="text-white uppercase font-bold">{currentUser.name}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-zinc-500">NAMBA YA SIMU:</span>
                      <span className="text-red-500 font-bold">{currentUser.phone}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-zinc-500">HALI (STATUS):</span>
                      <span className="text-red-500 font-bold uppercase animate-pulse">IMESITISHWA 🚫</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-zinc-400 tracking-wider block mb-2 font-bold uppercase">
                    👇 BONYEZA HAPA KUWASILIANA NA ADMIN WHATSAPP 👇
                  </span>
                  
                  <a
                    href={`https://wa.me/255743288942?text=${encodeURIComponent(
                      `Habari Mr. Example, namba yangu ya simu ${currentUser.phone} imesitishwa kutumika kwenye Betpawa Signal App.\n\nTafadhali ninaomba unisaidie kuirejesha nianze kutumia mawimbi tena.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => synth.playSuccess()}
                    className="w-full py-4 mb-6 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 border border-white/20 text-white text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 mt-1 shadow-[0_4px_20px_rgba(239,68,68,0.3)] hover:scale-[1.02] transform transition-all duration-300"
                  >
                    <span>OMBA MAREJESHO YA AKAUNTI WHATSAPP</span>
                  </a>

                  <button
                    onClick={handleLogout}
                    className="px-6 py-2.5 rounded-full border border-red-500/30 bg-red-950/20 text-red-400 font-mono text-xs uppercase hover:text-white hover:bg-red-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                    <span>Toka (Logout)</span>
                  </button>
                </div>
              ) : (
                /* WAITING INITIAL APPROVAL - YELLOW STYLING */
                <div className="bg-[#00640003] backdrop-blur-xl border border-yellow-500 rounded-[32px] p-6 sm:p-8 flex flex-col items-center animate-pulse">
                  <div className="p-4 rounded-full bg-yellow-500/10 border border-yellow-500/40 mb-4 animate-bounce">
                    <ShieldAlert className="w-8 h-8 text-yellow-500" />
                  </div>

                  <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider mb-2">
                    UKURASA WA KUSUBIRI RIDHAA (PENDING APPROVAL)
                  </h3>

                  <p className="text-zinc-300 text-xs leading-relaxed mb-6">
                    Habari <strong className="text-[#39FF14]">{currentUser.name}</strong>, akaunti yako imesajiliwa kikamilifu kwenye namba <strong className="text-white">{currentUser.phone}</strong>. Ili kuanza kuingia na kutumia huduma ya Betpawa Signal, <strong>Mr. Example</strong> anapaswa kuidhinisha (Approve) namba yako kwanza.
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

                  <span className="text-[10px] font-mono text-zinc-400 tracking-wider block mb-2 font-bold uppercase">
                    👇 BONYEZA KITUFE HIKI KUMTUMIA ADMIN MAOMBI YA KIBALI 👇
                  </span>
                  
                  <a
                    href={`https://wa.me/255743288942?text=${encodeURIComponent(
                      `Habari Mr. Example, nimejiunga kwenye Betpawa Signal App.\n\nTaarifa zangu ni:\nJina langu: ${currentUser.name}\nNamba yangu ya simu: ${currentUser.phone}\n\nTafadhali ni-approve (nipitishe) nianze kutumia mfumo wako wa signals.`
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
              )}
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
              {/* Logged in notification pill with admin member directory panel launch badge (Admin only) */}
              {currentUser.role === 'admin' && (
                <div className="w-full py-2.5 px-4 bg-black/50 border border-white/5 rounded-2xl flex items-center justify-between text-xs mb-2 z-10 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-zinc-400 font-mono text-[10px]">
                      PILOT: <strong className="text-white uppercase">{currentUser.name.split(' ')[0]}</strong>
                    </span>
                  </div>

                  {/* Admin controls link */}
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
                </div>
              )}

              {/* MKANDA WA SIGNAL ZA WIKI (Betpawa targets ribbon requested by user) - Shown to all approved users */}
              {currentUser && (
                <div className="w-full mt-1.5 z-10 flex flex-col gap-2 bg-gradient-to-br from-zinc-950 to-black/80 border border-fuchsia-500/10 rounded-[22px] p-3 shadow-xl relative overflow-hidden group hover:border-fuchsia-500/25 transition-all">
                  {/* Background Ambient Violet Glow */}
                  <div className="absolute -right-12 -top-12 w-24 h-24 bg-fuchsia-500/5 blur-2xl rounded-full" />
                  
                  {/* Header ribbon line */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-[9.5px] font-mono tracking-widest text-fuchsia-400 font-extrabold uppercase">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>MKANDA WA SIGNAL ZA WIKI</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#39FF14] animate-ping" />
                      <span className="text-[8px] font-mono text-zinc-500 tracking-wider">LIVE</span>
                    </div>
                  </div>

                  {/* Horizontal scroll ribbon viewport */}
                  <div className="flex gap-2.5 overflow-x-auto pb-1 px-0.5 scrollbar-none scrollbar-track-transparent scroll-smooth snap-x snap-mandatory">
                    {weeklySignals.length === 0 ? (
                      <div className="w-full text-center py-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-950/40 rounded-xl border border-dashed border-zinc-900 leading-normal">
                        Hakuna signal zilizowekwa kwa wiki hii bado.
                      </div>
                    ) : (
                      weeklySignals.map((sig) => (
                        <div
                          key={sig.id}
                          className="snap-start shrink-0 min-w-[125px] max-w-[135px] p-2 bg-black border border-zinc-900 rounded-xl flex flex-col gap-1 hover:border-fuchsia-500/40 transition-all cursor-default select-none relative overflow-hidden group/item"
                        >
                          {/* Status bar */}
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-zinc-850 group-hover/item:bg-fuchsia-500 transition-all" />
                          
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="text-[9.5px] font-black text-zinc-200 tracking-wide uppercase">{sig.day}</span>
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${sig.status === 'Active' ? 'bg-[#39FF14] shadow-[0_0_6px_#39FF14]' : 'bg-red-500'}`} />
                          </div>

                          <div>
                            <span className="text-[10px] font-mono font-black text-fuchsia-400 tracking-wider">{sig.time}</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-zinc-900/80 pt-1 mt-0.5 text-[8.5px]">
                            <div>
                              <span className="text-zinc-500 block text-[7px] uppercase font-light">Odds</span>
                              <span className="font-bold text-[#39FF14]">{sig.odd}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-zinc-500 block text-[7px] uppercase font-light">Uhakika</span>
                              <span className="font-bold text-yellow-400">{sig.accuracy || "98%"}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

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

              {/* ADMIN UPDATES & ANNOUNCEMENTS (Taarifa rasmi za Admin) */}
              {adminUpdates.length > 0 && (
                <div className="w-full mt-4 mb-2 z-10 flex flex-col gap-2.5 bg-zinc-950/40 border border-emerald-500/10 hover:border-emerald-500/25 rounded-2xl p-4 shadow-md transition-all">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-[#39FF14] font-extrabold uppercase">
                      <Activity className="w-3.5 h-3.5" />
                      <span>TAARIFA NA UPDATE KUTOKA KWA ADMIN</span>
                    </div>
                    <span className="py-0.5 px-2 rounded-full bg-emerald-500/10 text-[#39FF14] text-[8px] font-mono font-black animate-pulse">
                      NEW UPDATES
                    </span>
                  </div>

                  <div className="max-h-[160px] overflow-y-auto space-y-3 pr-1 divide-y divide-zinc-900 scrollbar-thin">
                    {adminUpdates.filter(upd => upd.status === 'Active').map((upd, i) => (
                      <div key={upd.id} className={`flex flex-col gap-1 ${i > 0 ? 'pt-3' : ''}`}>
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-xs font-bold text-white font-sans tracking-wide">
                            {upd.title}
                          </h4>
                          <span className="text-[8px] font-mono text-zinc-500 shrink-0">
                            {upd.createdAt}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-zinc-400 leading-relaxed font-sans font-normal antialiased">
                          {upd.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}




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
        <footer className="w-full mt-6 pt-5 border-t border-white/5 flex flex-col items-center gap-3.5 z-10">
          <button
            onClick={() => { synth.playClick(); setIsInstallOpen(true); }}
            className="px-4 py-2 rounded-xl bg-black/70 border border-[#39FF14]/30 hover:border-[#39FF14] text-[10px] font-mono text-[#39FF14] tracking-widest font-bold uppercase transition-all duration-300 flex items-center gap-2 hover:scale-105 hover:bg-emerald-950/20 cursor-pointer shadow-[0_0_15px_rgba(57,255,20,0.1)]"
          >
            <Smartphone className="w-3.5 h-3.5 animate-pulse" />
            <span>📲 SAKINISHA APP (DOWNLOAD APP)</span>
          </button>

          <p className="text-[#C0C0C0] text-[10px] sm:text-xs font-light tracking-[0.4em] opacity-40 uppercase font-display">
            PILOT SITE © 2026 • PREMIUM SIGNAL SYSTEM
          </p>
        </footer>

      </div>

      {/* Interactive Install App Instructions Modal */}
      <InstallModal isOpen={isInstallOpen} onClose={() => setIsInstallOpen(false)} />

      {/* Approved Welcome Notification Dialog Overlay */}
      <AnimatePresence>
        {showApprovedWelcomeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                synth.playClick();
                setShowApprovedWelcomeModal(false);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Body Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-[#39FF14]/40 hover:border-[#39FF14]/70 rounded-[28px] p-6 sm:p-8 text-center shadow-[0_0_30px_rgba(57,255,20,0.2)] overflow-hidden z-10"
            >
              {/* Pulsing Green Background Ambient Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#39FF14]/5 blur-3xl rounded-full -z-10" />

              {/* Big Check Success Badge icon */}
              <div className="mx-auto w-16 h-16 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/40 flex items-center justify-center mb-5 animate-bounce">
                <UserCheck2 className="w-8 h-8 text-[#39FF14]" />
              </div>

              <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-wide uppercase mb-2">
                AKAUNTI YAKO IMEKUBALIWA! 🎉
              </h2>
              
              <div className="text-[10px] font-mono text-emerald-400 tracking-widest uppercase mb-4 py-1 px-3 bg-[#39FF14]/10 rounded-full inline-block border border-[#39FF14]/20">
                APPROVED MEMBER STATUS DIRECTORY ✔
              </div>

              {/* Welcome text highlight box (requested by user) */}
              <div className="p-5 my-5 bg-gradient-to-br from-black to-zinc-900 border border-[#39FF14]/20 rounded-2xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
                <p className="text-[#39FF14] text-sm sm:text-base font-bold leading-relaxed tracking-wide uppercase select-none">
                  "KALIBU KWENYE APPLICATION YETU BORA, CHEZA ROUND 2 PEKEE ILI KUEPUKA LOSS✅️"
                </p>
              </div>

              <p className="text-zinc-400 text-xs leading-relaxed mb-6 max-w-sm mx-auto">
                Hongera! <strong className="text-white uppercase">{currentUser?.name}</strong>, sasa unaweza kupata na kutuma signals papo hapo ukiwa kama mwanachama aliyepitishwa rasmi na Admin wetu (<strong>Mr. Example</strong>).
              </p>

              <button
                onClick={() => {
                  synth.playSuccess();
                  setShowApprovedWelcomeModal(false);
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 border border-white/20 text-white text-xs font-black uppercase tracking-widest text-center shadow-[0_4px_20px_rgba(34,197,94,0.3)] hover:scale-[1.01] active:scale-[0.99] transform transition-all duration-300 cursor-pointer"
              >
                Sawa, nimefahamu (Anza)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
