/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Trash2, 
  ShieldAlert, 
  Search, 
  Sparkles, 
  X,
  XCircle,
  Clock,
  Smartphone,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  UserPlus,
  ClipboardList,
  Calendar,
  Plus,
  Edit2
} from 'lucide-react';
import { AppUser, SignalRequest, WeeklySignal, AdminUpdate } from '../types';
import { synth } from '../utils/audio';

interface UserManagementPanelProps {
  users: AppUser[];
  onToggleApproval: (userId: string, isApproved?: boolean, isSuspended?: boolean, status?: 'Pending' | 'Approved' | 'Rejected' | 'Suspended') => void;
  onDeleteUser: (userId: string) => void;
  onClose: () => void;
  logs?: SignalRequest[];
  onClearLogs?: () => void;
  weeklySignals: WeeklySignal[];
  onSaveWeeklySignal: (sig: Partial<WeeklySignal>) => Promise<void>;
  onDeleteWeeklySignal: (id: string) => Promise<void>;
  adminUpdates?: AdminUpdate[];
  onSaveAdminUpdate?: (upd: Partial<AdminUpdate>) => Promise<void>;
  onDeleteAdminUpdate?: (id: string) => Promise<void>;
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({
  users,
  onToggleApproval,
  onDeleteUser,
  onClose,
  logs = [],
  onClearLogs,
  weeklySignals = [],
  onSaveWeeklySignal,
  onDeleteWeeklySignal,
  adminUpdates = [],
  onSaveAdminUpdate,
  onDeleteAdminUpdate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [supabaseStatus, setSupabaseStatus] = useState<{ configured: boolean; url: string | null } | null>(null);

  React.useEffect(() => {
    fetch('/api/supabase-status')
      .then(res => res.json())
      .then(data => setSupabaseStatus(data))
      .catch(() => {});
  }, []);
  
  // Decide active section
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'suspended' | 'requests' | 'weekly_signals' | 'updates'>('pending');

  // Admin Updates Form States
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [formUpdTitle, setFormUpdTitle] = useState('');
  const [formUpdMessage, setFormUpdMessage] = useState('');
  const [formUpdStatus, setFormUpdStatus] = useState('Active');
  const [isSubmittingUpd, setIsSubmittingUpd] = useState(false);

  const handleSaveAdminUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUpdTitle || !formUpdMessage) {
      synth.playError();
      alert("Tafadhali jaza Kichwa cha habari na Ujumbe.");
      return;
    }
    setIsSubmittingUpd(true);
    try {
      synth.playSuccess();
      if (onSaveAdminUpdate) {
        await onSaveAdminUpdate({
          id: editingUpdateId || undefined,
          title: formUpdTitle,
          message: formUpdMessage,
          status: formUpdStatus
        });
      }
      // Clear form
      setEditingUpdateId(null);
      setFormUpdTitle('');
      setFormUpdMessage('');
      setFormUpdStatus('Active');
    } catch (err) {
      synth.playError();
    } finally {
      setIsSubmittingUpd(false);
    }
  };

  const handleEditUpdateClick = (upd: AdminUpdate) => {
    synth.playClick();
    setEditingUpdateId(upd.id);
    setFormUpdTitle(upd.title);
    setFormUpdMessage(upd.message);
    setFormUpdStatus(upd.status);
  };

  // Weekly Signal Form States
  const [editingSignalId, setEditingSignalId] = useState<string | null>(null);
  const [formDay, setFormDay] = useState('Jumatatu');
  const [formTime, setFormTime] = useState('');
  const [formOdd, setFormOdd] = useState('');
  const [formAccuracy, setFormAccuracy] = useState('98%');
  const [formStatus, setFormStatus] = useState('Active');
  const [isSubmittingSig, setIsSubmittingSig] = useState(false);

  const handleSaveWeeklySignalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDay || !formTime || !formOdd) {
      synth.playError();
      alert("Tafadhali jaza Siku, Muda na Odds.");
      return;
    }
    setIsSubmittingSig(true);
    try {
      synth.playSuccess();
      await onSaveWeeklySignal({
        id: editingSignalId || undefined,
        day: formDay,
        time: formTime,
        odd: formOdd,
        accuracy: formAccuracy,
        multiplier: formOdd + "x",
        status: formStatus
      });
      // Clear form
      setEditingSignalId(null);
      setFormTime('');
      setFormOdd('');
      setFormAccuracy('98%');
      setFormStatus('Active');
    } catch (err) {
      synth.playError();
    } finally {
      setIsSubmittingSig(false);
    }
  };

  const handleEditSignalClick = (sig: WeeklySignal) => {
    synth.playClick();
    setEditingSignalId(sig.id);
    setFormDay(sig.day);
    setFormTime(sig.time);
    setFormOdd(sig.odd);
    setFormAccuracy(sig.accuracy);
    setFormStatus(sig.status);
  };

  const handleCancelEdit = () => {
    synth.playClick();
    setEditingSignalId(null);
    setFormTime('');
    setFormOdd('');
    setFormAccuracy('98%');
    setFormStatus('Active');
  };

  const handleDeleteSignalClick = async (id: string) => {
    if (confirm("Je, una uhakika unataka kufuta signal hii ya wiki?")) {
      synth.playError();
      await onDeleteWeeklySignal(id);
    }
  };

  const handleApprove = (id: string) => {
    synth.playSuccess();
    onToggleApproval(id, true, false, 'Approved');
  };

  const handleReject = (id: string) => {
    synth.playError();
    onToggleApproval(id, false, false, 'Rejected');
  };

  const handleSuspend = (id: string) => {
    synth.playClick();
    onToggleApproval(id, false, true, 'Suspended');
  };

  const handleRestoreToPending = (id: string) => {
    synth.playClick();
    onToggleApproval(id, false, false, 'Pending');
  };

  const handleDelete = (id: string) => {
    const usrName = users.find(u => u.id === id)?.name || 'Mtumiaji';
    if (confirm(`Je, una uhakika unataka kumfuta kabisa mwanachama (${usrName}) kwenye mfumo? Data yake itafutika jumla!`)) {
      synth.playError();
      onDeleteUser(id);
    }
  };

  const handleClearAllLogs = () => {
    if (confirm('Je, una uhakika unataka kufuta rekodi zote za signal requests za watumiaji kwenye mfumo?')) {
      if (onClearLogs) {
        onClearLogs();
      }
    }
  };

  // Real-time counter metrics calculations
  const totalCount = users.length;
  
  const pendingUsers = users.filter(u => u.status === 'Pending' || (!u.isApproved && !u.isSuspended && u.status !== 'Rejected' && u.status !== 'Suspended'));
  const pendingCount = pendingUsers.length;

  const approvedUsers = users.filter(u => u.status === 'Approved' || (u.isApproved && !u.isSuspended && u.status !== 'Suspended'));
  const approvedCount = approvedUsers.length;

  const rejectedUsers = users.filter(u => u.status === 'Rejected');
  const rejectedCount = rejectedUsers.length;

  const suspendedUsers = users.filter(u => u.status === 'Suspended' || (u.isSuspended && u.status !== 'Rejected'));
  const suspendedCount = suspendedUsers.length;

  // Filter registrations made today
  const todayYMD = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  const todayRegistrations = users.filter(u => {
    return u.registrationDate === todayYMD || (u.registeredAt && u.registeredAt.startsWith(todayYMD));
  });
  const todayRegistrationsCount = todayRegistrations.length;

  // Search filter on all fields (Username, Phone, Name, ID)
  const getFilteredListForTab = (tab: 'pending' | 'approved' | 'rejected' | 'suspended') => {
    let sourceList: AppUser[] = [];
    if (tab === 'pending') sourceList = pendingUsers;
    else if (tab === 'approved') sourceList = approvedUsers;
    else if (tab === 'rejected') sourceList = rejectedUsers;
    else if (tab === 'suspended') sourceList = suspendedUsers;

    return sourceList.filter(u => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        u.name.toLowerCase().includes(term) ||
        (u.username && u.username.toLowerCase().includes(term)) ||
        u.phone.includes(term) ||
        u.id.toLowerCase().includes(term)
      );
    });
  };

  const activeFilteredUsers = getFilteredListForTab(activeTab === 'requests' ? 'pending' : activeTab);

  const term = searchTerm.toLowerCase().trim();
  const filteredLogs = logs.filter(log => {
    if (!term) return true;
    return (
      (log.userName && log.userName.toLowerCase().includes(term)) ||
      (log.userPhone && log.userPhone.toLowerCase().includes(term)) ||
      (log.signalTime && log.signalTime.toLowerCase().includes(term)) ||
      (log.mode && log.mode.toLowerCase().includes(term)) ||
      (log.id && log.id.toLowerCase().includes(term))
    );
  });

  return (
    <motion.div
       initial={{ opacity: 0, scale: 0.96 }}
       animate={{ opacity: 1, scale: 1 }}
       exit={{ opacity: 0, scale: 0.96 }}
       className="w-full bg-[#000000] border-2 border-[#C0C0C033] rounded-[36px] p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative text-white"
    >
      {/* Absolute Close Header button */}
      <button
        onClick={() => { synth.playClick(); onClose(); }}
        className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer z-20"
        title="Funga Dashbodi"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Main title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#004d00]/30 to-black border border-[#C0C0C020]">
          <Users className="w-5 h-5 text-[#39FF14] animate-pulse" />
        </div>
        <div>
          <h3 className="font-display font-black text-xl tracking-[0.1em] uppercase text-white">
            ADMIN MEMBER CONTROL
          </h3>
          <p className="text-[9px] font-mono tracking-widest text-[#39FF14]/70 uppercase font-bold">
            Mr. Example • Pilot Site Systems Dashboard
          </p>
          {supabaseStatus && (
            <div className={`mt-1.5 flex items-center gap-1.5 px-2 bg-gradient-to-r py-0.5 rounded-full text-[8px] font-mono tracking-wider w-fit font-bold uppercase select-none border border-[#C0C0C01a] transition-all ${
              supabaseStatus.configured 
                ? 'from-emerald-950/40 to-black/30 text-emerald-400' 
                : 'from-amber-950/20 to-black/30 text-amber-500'
            }`}>
              <span className={`h-1 cursor-default w-1 rounded-full ${supabaseStatus.configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>
                Supabase Auth: {supabaseStatus.configured ? "ONLINE" : "OFFLINE (Local/Firestore fallback)"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Real-time statistics counters cards row bar */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
        
        {/* Metric 1: Total users */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center shadow-lg">
          <span className="text-[7.5px] uppercase text-zinc-500 tracking-widest font-mono font-bold">WANACHAMA</span>
          <span className="text-xl font-mono font-bold text-zinc-200 mt-1">{totalCount}</span>
        </div>

        {/* Metric 2: Pending requests */}
        <div className={`bg-zinc-950/80 border ${pendingCount > 0 ? 'border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)]' : 'border-zinc-800/80'} rounded-2xl p-2.5 text-center flex flex-col items-center justify-center relative overflow-hidden`}>
          {pendingCount > 0 && <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500 animate-ping" />}
          <span className={`text-[7.5px] uppercase ${pendingCount > 0 ? 'text-yellow-400 font-bold' : 'text-zinc-500'} tracking-widest font-mono`}>KUSUBIRI</span>
          <span className={`text-xl font-mono font-bold ${pendingCount > 0 ? 'text-yellow-400' : 'text-zinc-400'} mt-1`}>{pendingCount}</span>
        </div>

        {/* Metric 3: Approved users */}
        <div className="bg-zinc-950/80 border border-emerald-500/20 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center shadow-lg">
          <span className="text-[7.5px] uppercase text-[#39FF14]/80 tracking-widest font-mono font-bold">APPROVED</span>
          <span className="text-xl font-mono font-bold text-[#39FF14] mt-1">{approvedCount}</span>
        </div>

        {/* Metric 4: Rejected users */}
        <div className="bg-zinc-950/80 border border-red-500/20 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center shadow-lg">
          <span className="text-[7.5px] uppercase text-red-500 tracking-widest font-mono font-bold">REJECTED</span>
          <span className="text-xl font-mono font-bold text-red-500 mt-1">{rejectedCount}</span>
        </div>

        {/* Metric 5: Today's registrations */}
        <div className="bg-zinc-950/80 border border-sky-500/20 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center col-span-2 xs:col-span-1 shadow-lg">
          <span className="text-[7.5px] uppercase text-zinc-400 tracking-widest font-mono font-bold">SAJILI LEO</span>
          <span className="text-xl font-mono font-bold text-zinc-100 mt-1">{todayRegistrationsCount}</span>
        </div>

      </div>

      {/* Instant Search Bar */}
      <div className="relative mb-5 flex gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute inset-y-0 left-3.5 my-auto w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder={activeTab === 'requests' ? "Tafuta Jina la User, Simu, Signal au Mode..." : "Tafuta kwa Username, Simu, Jina, au ID..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-[#C0C0C044] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#39FF14] transition-all font-mono"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-3.5 my-auto text-zinc-500 hover:text-white text-xs font-mono lowercase"
            >
              clear
            </button>
          )}
        </div>
        
        {activeTab === 'requests' && logs.length > 0 && onClearLogs && (
          <button
            onClick={handleClearAllLogs}
            className="px-3 py-2 bg-red-950/25 hover:bg-red-500/25 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Sura zote za signal requests"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Futa Zote (Wipe)</span>
          </button>
        )}
      </div>

      {/* Horizontal Nav Bar Tabs for Admin control sections */}
      <div className="flex border-b border-zinc-800/80 mb-5 overflow-x-auto gap-2">
        
        {/* Button Section A: PENDING */}
        <button
          onClick={() => { synth.playClick(); setActiveTab('pending'); }}
          className={`py-3 px-4 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all min-w-max flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'pending'
              ? 'border-yellow-500 text-yellow-400 bg-yellow-500/5'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span>PENDING REQUESTS</span>
          <span className="py-0.5 px-1.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">
            {pendingCount}
          </span>
        </button>

        {/* Button Section B: APPROVED */}
        <button
          onClick={() => { synth.playClick(); setActiveTab('approved'); }}
          className={`py-3 px-4 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all min-w-max flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'approved'
              ? 'border-[#39FF14] text-[#39FF14] bg-[#39FF14]/5'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span>APPROVED MEMBERS</span>
          <span className="py-0.5 px-1.5 rounded-full bg-emerald-500/10 text-[#39FF14] text-[10px] font-bold">
            {approvedCount}
          </span>
        </button>

        {/* Button Section C: REJECTED */}
        <button
          onClick={() => { synth.playClick(); setActiveTab('rejected'); }}
          className={`py-3 px-4 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all min-w-max flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'rejected'
              ? 'border-red-600 text-red-500 bg-red-600/5'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span>REJECTED REQUESTS</span>
          <span className="py-0.5 px-1.5 rounded-full bg-red-600/10 text-red-400 text-[10px] font-bold">
            {rejectedCount}
          </span>
        </button>

        {/* Button Section D: SUSPENDED */}
        <button
          onClick={() => { synth.playClick(); setActiveTab('suspended'); }}
          className={`py-3 px-4 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all min-w-max flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'suspended'
              ? 'border-zinc-400 text-zinc-300 bg-zinc-400/5'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span>SUSPENDED</span>
          <span className="py-0.5 px-1.5 rounded-full bg-zinc-400/10 text-zinc-300 text-[10px] font-bold">
            {suspendedCount}
          </span>
        </button>

        {/* Button Section E: USER REQUESTS */}
        <button
          onClick={() => { synth.playClick(); setActiveTab('requests'); }}
          className={`py-3 px-4 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all min-w-max flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'requests'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 text-[#39FF14]" />
          <span>REKODI ZA SIGNAL</span>
          <span className="py-0.5 px-1.5 rounded-full bg-emerald-500/10 text-[#39FF14] text-[10px] font-bold">
            {logs.length}
          </span>
        </button>

        {/* Button Section F: WEEKLY SIGNALS */}
        <button
          onClick={() => { synth.playClick(); setActiveTab('weekly_signals'); }}
          className={`py-3 px-4 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all min-w-max flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'weekly_signals'
              ? 'border-fuchsia-500 text-fuchsia-400 bg-fuchsia-500/5'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-fuchsia-400" />
          <span>SIGNAL ZA WIKI</span>
          <span className="py-0.5 px-1.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 text-[10px] font-bold">
            {weeklySignals.length}
          </span>
        </button>

        {/* Button Section G: ADMIN UPDATES */}
        <button
          onClick={() => { synth.playClick(); setActiveTab('updates'); }}
          className={`py-3 px-4 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all min-w-max flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'updates'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>UPDATES ZA ADMIN</span>
          <span className="py-0.5 px-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
            {adminUpdates.length}
          </span>
        </button>

      </div>

      {/* Main listed items scroll viewport */}
      <div className="max-h-[320px] overflow-y-auto pr-1 flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {activeTab === 'updates' ? (
            <motion.div
              key="admin-upd-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 w-full pb-6"
            >
              {/* Form container */}
              <form onSubmit={handleSaveAdminUpdateSubmit} className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/20 shadow-md">
                <span className="text-[10px] font-mono text-emerald-400 block tracking-widest uppercase font-bold mb-3">
                  {editingUpdateId ? "⚡ HARIRI TAARIFA YA ADMIN" : "✨ WEKA TAARIFA / UPDATE MPYA"}
                </span>
                <div className="grid grid-cols-1 gap-3 mb-3">
                  <div>
                    <label className="text-[8.5px] font-mono text-zinc-500 uppercase block mb-1">Kichwa cha Taarifa (Title)</label>
                    <input
                      type="text"
                      placeholder="e.g. Toleo Jipya la Betpawa Signal"
                      value={formUpdTitle}
                      onChange={(e) => setFormUpdTitle(e.target.value)}
                      className="w-full bg-black border border-zinc-850 text-xs text-white rounded-lg p-2 font-mono outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[8.5px] font-mono text-zinc-500 uppercase block mb-1">Ujumbe Mrefu (Message Body)</label>
                    <textarea
                      placeholder="Andika taarifa rasmi hapa kwa watumiaji..."
                      value={formUpdMessage}
                      onChange={(e) => setFormUpdMessage(e.target.value)}
                      className="w-full h-20 bg-black border border-zinc-850 text-xs text-white rounded-lg p-2 font-mono outline-none focus:border-emerald-500 resize-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8.5px] font-mono text-zinc-500 uppercase block mb-1">Status</label>
                      <select
                        value={formUpdStatus}
                        onChange={(e) => setFormUpdStatus(e.target.value)}
                        className="w-full bg-black border border-zinc-850 text-xs text-white rounded-lg p-2.5 font-mono outline-none focus:border-emerald-500"
                      >
                        <option value="Active">Active (Publish)</option>
                        <option value="Draft">Draft (Hide)</option>
                      </select>
                    </div>

                    <div className="flex items-end justify-end gap-1.5 pt-1.5 xs:pt-0">
                      {editingUpdateId && (
                        <button
                          type="button"
                          onClick={() => {
                            synth.playClick();
                            setEditingUpdateId(null);
                            setFormUpdTitle('');
                            setFormUpdMessage('');
                            setFormUpdStatus('Active');
                          }}
                          className="flex-1 py-2.5 bg-zinc-850 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono rounded-lg cursor-pointer uppercase transition-all"
                        >
                          Ghairi
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmittingUpd}
                        className="flex-1 py-2.5 bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-500 hover:text-white text-emerald-400 text-[10px] uppercase font-mono font-bold rounded-lg cursor-pointer transition-all"
                      >
                        {isSubmittingUpd ? "Inapakia..." : (editingUpdateId ? "Hifadhi" : "Weka")}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Updates list */}
              {adminUpdates.length === 0 ? (
                <div className="py-8 border border-dashed border-zinc-800 rounded-3xl text-center text-xs font-mono text-zinc-500">
                  Hakuna taarifa rasmi zilizotumwa kwa sasa.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {adminUpdates.map((upd) => (
                    <div
                      key={upd.id}
                      className="p-3.5 bg-[#080808] border border-zinc-850 rounded-2xl flex flex-col gap-2 hover:border-emerald-500/30 transition-all font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${upd.status === 'Active' ? 'bg-[#39FF14] animate-pulse shadow-[0_0_8px_#39FF14]' : 'bg-yellow-500'}`} />
                          <span className="text-xs font-bold text-zinc-200">{upd.title}</span>
                        </div>
                        <span className="text-[8px] text-zinc-500">{upd.createdAt}</span>
                      </div>
                      
                      <p className="text-[10.5px] text-zinc-400 font-sans leading-relaxed">
                        {upd.message}
                      </p>

                      <div className="flex items-center justify-between border-t border-zinc-900/85 pt-2 mt-1">
                        <span className="text-[8px] text-zinc-500">
                          ID: {upd.id} | STATUS: <strong className={upd.status === 'Active' ? 'text-emerald-400' : 'text-yellow-400'}>{upd.status.toUpperCase()}</strong>
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditUpdateClick(upd)}
                            className="p-1 px-2 border border-zinc-800 hover:border-emerald-500 text-zinc-400 hover:text-emerald-400 rounded-lg transition-all cursor-pointer flex items-center gap-0.5 text-[10.1px]"
                            title="Hariri update"
                          >
                            <span className="hidden xs:inline">Hariri</span>
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Je, una uhakika unataka kufuta update hii?") && onDeleteAdminUpdate) {
                                synth.playClick();
                                onDeleteAdminUpdate(upd.id);
                              }
                            }}
                            className="p-1 px-2 border border-zinc-800 hover:border-red-500 text-zinc-500 hover:text-red-400 rounded-lg transition-all cursor-pointer flex items-center gap-0.5 text-[10.1px]"
                            title="Futa update"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'weekly_signals' ? (
            <motion.div
              key="weekly-sig-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 w-full pb-6"
            >
              {/* Form container */}
              <form onSubmit={handleSaveWeeklySignalSubmit} className="p-4 rounded-2xl bg-zinc-950 border border-fuchsia-500/20 shadow-md">
                <span className="text-[10px] font-mono text-fuchsia-400 block tracking-widest uppercase font-bold mb-3">
                  {editingSignalId ? "⚡ HARIRI SIGNAL YA WIKI" : "✨ WEKA SIGNAL MPYA YA WIKI"}
                </span>
                <div className="grid grid-cols-2 xs:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-[8.5px] font-mono text-zinc-500 uppercase block mb-1">Siku ya Wiki</label>
                    <select
                      value={formDay}
                      onChange={(e) => setFormDay(e.target.value)}
                      className="w-full bg-black border border-zinc-850 text-xs text-white rounded-lg p-2 font-mono outline-none focus:border-fuchsia-500"
                    >
                      {["Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi", "Jumapili"].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[8.5px] font-mono text-zinc-500 uppercase block mb-1">Muda (e.g. 10:30 PM)</label>
                    <input
                      type="text"
                      placeholder="Muda (PM/AM)"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full bg-black border border-zinc-850 text-xs text-white rounded-lg p-2 font-mono outline-none focus:border-fuchsia-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[8.5px] font-mono text-zinc-500 uppercase block mb-1">Target Odds</label>
                    <input
                      type="text"
                      placeholder="Odds"
                      value={formOdd}
                      onChange={(e) => setFormOdd(e.target.value)}
                      className="w-full bg-black border border-zinc-850 text-[#39FF14] text-xs rounded-lg p-2 font-mono outline-none focus:border-fuchsia-500 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[8.5px] font-mono text-zinc-500 uppercase block mb-1">Accuracy %</label>
                    <input
                      type="text"
                      placeholder="Accuracy"
                      value={formAccuracy}
                      onChange={(e) => setFormAccuracy(e.target.value)}
                      className="w-full bg-black border border-zinc-850 text-yellow-400 text-xs rounded-lg p-2 font-mono outline-none focus:border-fuchsia-500"
                    />
                  </div>

                  <div>
                    <label className="text-[8.5px] font-mono text-zinc-500 uppercase block mb-1">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full bg-black border border-zinc-855 text-xs text-white rounded-lg p-2 font-mono outline-none focus:border-fuchsia-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>

                  <div className="flex items-end justify-end gap-1.5 pt-1.5 xs:pt-0">
                    {editingSignalId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 py-2 bg-zinc-850 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono rounded-lg cursor-pointer uppercase transition-all"
                      >
                        Ghairi
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmittingSig}
                      className="flex-1 py-2 bg-fuchsia-950/40 hover:bg-fuchsia-600 border border-fuchsia-500 hover:text-white text-fuchsia-400 text-[10px] uppercase font-mono font-bold rounded-lg cursor-pointer transition-all"
                    >
                      {isSubmittingSig ? "Inapakia..." : (editingSignalId ? "Hifadhi" : "Weka")}
                    </button>
                  </div>
                </div>
              </form>

              {/* Signals list */}
              {weeklySignals.length === 0 ? (
                <div className="py-8 border border-dashed border-zinc-800 rounded-3xl text-center text-xs font-mono text-zinc-500">
                  Hakuna signal za wiki zilizowekwa bado.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {weeklySignals.map((sig) => (
                    <div
                      key={sig.id}
                      className="p-3 bg-[#080808] border border-zinc-850 rounded-2xl flex items-center justify-between hover:border-fuchsia-500/30 transition-all font-mono"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${sig.status === 'Active' ? 'bg-[#39FF14] animate-pulse shadow-[0_0_8px_#39FF14]' : 'bg-zinc-650'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-200">{sig.day}</span>
                            <span className="text-[9px] bg-fuchsia-950/50 text-fuchsia-400 px-1.5 py-0.5 rounded border border-fuchsia-500/20">{sig.time}</span>
                            {sig.status === 'Expired' && (
                              <span className="text-[8px] bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded font-thin">PITA</span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">Odds: <strong className="text-[#39FF14]">{sig.odd}</strong> | Accuracy: <strong className="text-yellow-400">{sig.accuracy}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditSignalClick(sig)}
                          className="p-1 px-2 border border-zinc-800 hover:border-fuchsia-500 text-zinc-400 hover:text-fuchsia-400 rounded-lg transition-all cursor-pointer flex items-center gap-0.5 text-[10px]"
                          title="Hariri signal"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span className="hidden xs:inline">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSignalClick(sig.id)}
                          className="p-1 px-2 border border-zinc-800 hover:border-red-500 text-zinc-500 hover:text-red-400 rounded-lg transition-all cursor-pointer flex items-center gap-0.5 text-[10px]"
                          title="Futa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'requests' ? (
            filteredLogs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 border border-dashed border-zinc-800 rounded-3xl text-center text-xs font-mono text-zinc-500 flex flex-col items-center justify-center gap-2"
              >
                <XCircle className="w-7 h-7 text-zinc-700 animate-pulse" />
                <span>Hakuna kumbukumbu za requests za signals kwa sasa.</span>
              </motion.div>
            ) : (
              filteredLogs.map((log) => {
                const isSuccess = log.status === 'READY';
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden group hover:border-[#39FF14]/30"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#39FF14]/40" />
                    
                    <div className="flex items-start gap-2.5 pl-2.5">
                      <div className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center mt-0.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[#39FF14] opacity-35 animate-pulse" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#39FF14]" />
                      </div>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white tracking-wide uppercase leading-tight font-display">
                            {log.userName || 'Mtumiaji'}
                          </span>
                          {log.userPhone && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
                              {log.userPhone}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                          <span>[{log.timestamp}]</span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900/40 border border-zinc-900 text-[8px] uppercase tracking-wider text-[#39FF14]">
                            {(log.mode || '').replace('INTERVAL_', 'INT_')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pr-2 self-stretch sm:self-auto border-t border-zinc-900 sm:border-0 pt-2 sm:pt-0 pl-2.5 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-mono font-black text-[#39FF14] tracking-wider block">
                          {log.signalTime}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest pl-0.5">
                          Signal Requested
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-neutral-900/60 px-2.5 py-1 rounded-full border border-white/5">
                        <CheckCircle className={`w-3.5 h-3.5 ${isSuccess ? 'text-[#39FF14]' : 'text-red-400'}`} />
                        <span className={`text-[9px] font-bold ${isSuccess ? 'text-[#39FF14]' : 'text-red-400'}`}>
                          {log.status === 'READY' ? 'DISPATCHED' : 'ERR'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )
          ) : activeFilteredUsers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 border border-dashed border-zinc-800 rounded-3xl text-center text-xs font-mono text-zinc-500 flex flex-col items-center justify-center gap-2"
            >
              <XCircle className="w-7 h-7 text-zinc-700 animate-pulse" />
              <span>Hakuna kumbukumbu kwenye kitengo hiki kwa sasa.</span>
            </motion.div>
          ) : (
            activeFilteredUsers.map((user) => {
              const isAdmin = user.role === 'admin';
              
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`p-4 rounded-2xl bg-[#080808] border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all relative overflow-hidden group hover:border-zinc-600 ${
                    activeTab === 'approved' 
                      ? 'border-emerald-500/15' 
                      : activeTab === 'suspended'
                      ? 'border-zinc-800 bg-zinc-950/20'
                      : activeTab === 'rejected'
                      ? 'border-red-500/15' 
                      : 'border-yellow-500/15 bg-yellow-950/5'
                  }`}
                >
                  {/* Visual Left decorative glow indicator */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${
                    activeTab === 'approved' ? 'bg-[#39FF14]' :
                    activeTab === 'suspended' ? 'bg-zinc-600' :
                    activeTab === 'rejected' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`} />

                  <div className="flex items-start gap-3 pl-2">
                    
                    {/* Status Ledger circular beacon */}
                    <div className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center mt-1">
                      {activeTab === 'approved' ? (
                        <>
                          <span className="absolute inline-flex h-full w-full rounded-full bg-[#39FF14] opacity-50 animate-ping" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#39FF14]" />
                        </>
                      ) : activeTab === 'suspended' ? (
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-zinc-600" />
                      ) : activeTab === 'rejected' ? (
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                      ) : (
                        <>
                          <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-50 animate-pulse" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-yellow-400" />
                        </>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white tracking-wide uppercase leading-tight font-display">{user.name}</span>
                        {isAdmin && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-600/35 border border-red-500/30 text-red-200 uppercase font-mono tracking-wider">
                            System Admin
                          </span>
                        )}
                        {!isAdmin && (
                          <span className="px-2 py-0.5 rounded text-[8px] font-mono tracking-widest text-[#C0C0C0] bg-zinc-950 border border-zinc-800">
                            @{user.username || user.phone}
                          </span>
                        )}
                      </div>

                      {/* Display Phone, ID stats */}
                      <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono text-zinc-400 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-zinc-600" />
                          <span className="text-[#C0C0C0] font-bold">{user.phone}</span>
                        </div>
                        {user.id && (
                          <div className="text-zinc-500 flex items-center gap-1 sm:justify-start">
                            <span className="text-[9px]">ID:</span>
                            <span className="text-[10px] select-all uppercase">{user.id}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 col-span-1 xs:col-span-2">
                          <Clock className="w-3.5 h-3.5 text-zinc-600" />
                          <span>
                            Sajili: <strong className="text-zinc-300 font-semibold">{user.registeredAt || (`${user.registrationDate} ${user.registrationTime}`)}</strong>
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Actions column buttons block */}
                  <div className="flex items-center gap-2 self-end sm:self-center pr-2 border-t border-zinc-900 sm:border-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                    {!isAdmin && (
                      <>
                        
                        {/* Section A Controls: Pending list */}
                        {activeTab === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="px-3 py-1.5 bg-[#39FF14]/15 hover:bg-[#39FF14]/30 border border-[#39FF14]/40 hover:border-[#39FF14] rounded-xl text-[10px] uppercase font-mono font-bold tracking-wider text-[#39FF14] transition-all cursor-pointer flex items-center gap-1"
                              title="Idhinisha usajili wake"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Pitisha (Approve)</span>
                            </button>
                            <button
                              onClick={() => handleReject(user.id)}
                              className="px-3 py-1.5 bg-red-950/20 hover:bg-red-500/25 border border-red-500/30 hover:border-red-500 rounded-xl text-[10px] uppercase font-mono font-bold tracking-wider text-red-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                              title="Kataa usajili"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Kataaa (Reject)</span>
                            </button>
                          </>
                        )}

                        {/* Section B Controls: Approved list */}
                        {activeTab === 'approved' && (
                          <button
                            onClick={() => handleSuspend(user.id)}
                            className="px-3 py-1.5 bg-zinc-900 border border-red-500/20 hover:border-red-500 rounded-xl text-[9.5px] uppercase font-mono text-red-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                            title="Simamisha matumizi kwa muda"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Sitisha (Suspend)</span>
                          </button>
                        )}

                        {/* Section C Controls: Rejected list */}
                        {activeTab === 'rejected' && (
                          <>
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 hover:border-[#39FF14] rounded-xl text-[10px] uppercase font-mono text-[#39FF14] transition-all cursor-pointer flex items-center gap-1"
                              title="Idhinisha kuwa mwanachama kuanzia sasa"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Idhinisha (Restore)</span>
                            </button>
                            
                            <button
                              onClick={() => handleRestoreToPending(user.id)}
                              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-xl text-[9.5px] uppercase font-mono text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                              title="Rejesha kwenye list ya kusubiri upya"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </button>
                          </>
                        )}

                        {/* Section D Controls: Suspended list */}
                        {activeTab === 'suspended' && (
                          <>
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="px-3 py-1.5 bg-emerald-500/15 border border-[#39FF14]/40 hover:border-[#39FF14] rounded-xl text-[10px] uppercase font-mono font-bold tracking-wider text-[#39FF14] transition-all cursor-pointer flex items-center gap-1"
                              title="Rejesha haki ya kutumia Signals"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Rejesha (Activate)</span>
                            </button>

                            <button
                              onClick={() => handleReject(user.id)}
                              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[9.5px] uppercase font-mono text-red-500 transition-all cursor-pointer"
                              title="Kataa kibali"
                            >
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {/* Always visible permanent Delete option */}
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 bg-red-950/25 border border-red-500/15 hover:border-red-500 hover:bg-red-500/20 rounded-xl text-red-400 hover:text-red-300 transition-all cursor-pointer shrink-0"
                          title="Futa database ya mwanachama huyu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </>
                    )}
                  </div>

                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
};
