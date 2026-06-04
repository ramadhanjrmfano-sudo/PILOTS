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
  PlusCircle, 
  Sparkles, 
  X,
  XCircle
} from 'lucide-react';
import { AppUser } from '../types';
import { synth } from '../utils/audio';

interface UserManagementPanelProps {
  users: AppUser[];
  onToggleApproval: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onAddSimulatedUser: (name: string, phone: string, isApproved: boolean) => void;
  onClose: () => void;
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({
  users,
  onToggleApproval,
  onDeleteUser,
  onAddSimulatedUser,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'approved'>('all');

  const handleToggle = (id: string) => {
    synth.playClick();
    onToggleApproval(id);
  };

  const handleDelete = (id: string) => {
    synth.playError();
    onDeleteUser(id);
  };

  const triggerAddMockMember = () => {
    synth.playSuccess();
    const names = [
      'Ally Mkude', 'Rose Joseph', 'Hamisi Juma', 'Rehema Said', 
      'Emmanuel Massawe', 'Neema Kessy', 'Faraji Mwakaleli'
    ];
    const phones = [
      '0755998811', '0688445522', '0711993344', '0655883399',
      '0766228833', '0788663322', '0622558811'
    ];
    const randIdx = Math.floor(Math.random() * names.length);
    const mockName = names[randIdx];
    const mockPhone = phones[randIdx] + ' - ' + Math.floor(Math.random() * 900 + 100);

    onAddSimulatedUser(mockName, mockPhone, false);
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.phone.includes(searchTerm);
    if (!matchesSearch) return false;

    if (filterType === 'pending') return !u.isApproved;
    if (filterType === 'approved') return u.isApproved;
    return true;
  });

  const totalCount = users.length;
  const approvedCount = users.filter(u => u.isApproved).length;
  const pendingCount = users.filter(u => !u.isApproved).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="w-full bg-[#030a03]/98 backdrop-blur-xl border-2 border-[#C0C0C040] rounded-[36px] p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative text-white"
    >
      {/* Absolute Close Header button */}
      <button
        onClick={() => { synth.playClick(); onClose(); }}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        title="Funga Dashbodi"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Main title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-[#006400]/40 border border-[#C0C0C040]">
          <Users className="w-5 h-5 text-neon-green" />
        </div>
        <div>
          <h3 className="font-display font-black text-xl tracking-[0.1em] uppercase text-white">
            ADMIN MEMBER CONTROL
          </h3>
          <p className="text-[9px] font-mono tracking-widest text-[#C0C0C0]/60 uppercase">
            MEMBERSHIP DIRECTORY & ACCOUNT APPROVALS
          </p>
        </div>
      </div>

      {/* Summary dashboard counting metrics cards row */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6">
        <div className="bg-black/60 border border-[#C0C0C020] rounded-2xl p-2.5 sm:p-3.5 text-center flex flex-col items-center">
          <span className="text-[9px] sm:text-[10px] uppercase text-[#C0C0C0]/60 tracking-wider">MEMBER WOTE</span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-white mt-1">{totalCount}</span>
        </div>
        <div className="bg-black/60 border border-green-500/20 rounded-2xl p-2.5 sm:p-3.5 text-center flex flex-col items-center">
          <span className="text-[9px] sm:text-[10px] uppercase text-[#39FF14]/75 tracking-wider">WALIOPITISHWA</span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-[#39FF14] mt-1">{approvedCount}</span>
        </div>
        <div className="bg-black/60 border border-yellow-500/20 rounded-2xl p-2.5 sm:p-3.5 text-center flex flex-col items-center">
          <span className="text-[9px] sm:text-[10px] uppercase text-yellow-500/75 tracking-wider">WANAOSUBIRI</span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-yellow-400 mt-1">{pendingCount}</span>
        </div>
      </div>

      {/* Search and filters controls */}
      <div className="space-y-3.5 mb-5">
        <div className="relative">
          <Search className="absolute inset-y-0 left-3.5 my-auto w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Tafuta mwanachama kwa jina au simu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/50 border border-[#C0C0C030] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-neon-green transition-all"
          />
        </div>

        <div className="flex gap-2 justify-between items-center sm:grid sm:grid-cols-2 lg:flex">
          {/* Quick Filter tabs */}
          <div className="flex gap-1.5 bg-black/40 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => { synth.playClick(); setFilterType('all'); }}
              className={`px-3 py-1 text-[10px] uppercase font-mono tracking-wider rounded-md transition-all cursor-pointer ${
                filterType === 'all' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Wote
            </button>
            <button
              onClick={() => { synth.playClick(); setFilterType('pending'); }}
              className={`px-3 py-1 text-[10px] uppercase font-mono tracking-wider rounded-md transition-all cursor-pointer ${
                filterType === 'pending' ? 'bg-yellow-500/20 text-yellow-400 font-bold' : 'text-zinc-500 hover:text-yellow-500/60'
              }`}
            >
              Kusubiri ({pendingCount})
            </button>
            <button
              onClick={() => { synth.playClick(); setFilterType('approved'); }}
              className={`px-3 py-1 text-[10px] uppercase font-mono tracking-wider rounded-md transition-all cursor-pointer ${
                filterType === 'approved' ? 'bg-green-500/20 text-green-400 font-bold' : 'text-zinc-500 hover:text-green-500/60'
              }`}
            >
              Onyesha ({approvedCount})
            </button>
          </div>

          {/* Simulated user creation button */}
          <button
            onClick={triggerAddMockMember}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-900 to-green-950 border border-green-500/40 rounded-lg text-[9px] uppercase font-mono tracking-wider text-green-300 flex items-center gap-1 hover:text-white hover:border-green-500 hover:scale-105 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3 h-3" />
            <span>Mock User</span>
          </button>
        </div>
      </div>

      {/* Main user listing table/scrollpane */}
      <div className="max-h-[290px] overflow-y-auto pr-1 flex flex-col gap-2.5">
        {filteredUsers.length === 0 ? (
          <div className="py-12 border border-dashed border-[#C0C0C020] rounded-2xl text-center text-xs font-mono text-zinc-500 flex flex-col items-center justify-center gap-2">
            <XCircle className="w-6 h-6 text-zinc-500/50" />
            <span>Hakuna wanachama waliopatikana kwa sasa.</span>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isAdmin = user.role === 'admin';
            return (
              <div
                key={user.id}
                className={`p-3 rounded-2xl bg-black/70 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  user.isApproved ? 'border-green-500/10' : 'border-yellow-500/25 bg-amber-950/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Ledger pulsing color indicator dot */}
                  <div className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {user.isApproved ? (
                      <>
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </>
                    ) : (
                      <>
                        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-60 animate-pulse" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                      </>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white leading-snug">{user.name}</span>
                      {isAdmin && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-600/35 border border-red-500/30 text-red-200 uppercase font-mono tracking-wider shrink-0">
                          System Admin
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                      <span className="text-[#C0C0C0] font-semibold">{user.phone}</span>
                      <span>•</span>
                      <span>Sajili: {user.registeredAt}</span>
                    </div>
                  </div>
                </div>

                {/* System actions control bundle */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!isAdmin && (
                    <>
                      {user.isApproved ? (
                        <button
                          onClick={() => handleToggle(user.id)}
                          className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-500 rounded-lg text-[9px] uppercase font-mono tracking-wider text-yellow-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                          title="Fungia mwanachama asitume mawimbi"
                        >
                          <UserX className="w-3 h-3" />
                          <span>Sitisha</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggle(user.id)}
                          className="px-2.5 py-1 bg-green-500/20 border border-green-500/40 hover:border-[#39FF14] rounded-lg text-[9.5px] uppercase font-mono font-bold tracking-wider text-[#39FF14] hover:text-white transition-all cursor-pointer flex items-center gap-1"
                          title="Pitisha mwanachama huyu"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Pitisha (Approve)</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 bg-red-500/15 border border-red-500/20 hover:border-red-500 hover:bg-red-500/25 rounded-lg text-red-400 hover:text-white transition-all cursor-pointer"
                        title="Futa usajili"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </motion.div>
  );
};
