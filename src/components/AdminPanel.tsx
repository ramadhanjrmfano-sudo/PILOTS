/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { SignalMode } from '../types';
import { synth } from '../utils/audio';
import { Sliders } from 'lucide-react';

interface AdminPanelProps {
  currentMode: SignalMode;
  onModeChange: (mode: SignalMode) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentMode, onModeChange }) => {
  const modes: { id: SignalMode; name: string; label: string }[] = [
    { id: 'SCHEDULE', name: 'Original List', label: 'Manual List' },
    { id: 'INTERVAL_3', name: 'Mode 1: 3 Min', label: '3 Min dynamic' },
    { id: 'INTERVAL_5', name: 'Mode 2: 5 Min', label: '5 Min dynamic' },
    { id: 'INTERVAL_10', name: 'Mode 3: 10 Min', label: '10 Min dynamic' }
  ];

  const handleSelect = (modeId: SignalMode) => {
    synth.playClick();
    onModeChange(modeId);
  };

  return (
    <div className="w-full mt-8 flex flex-col items-center">
      {/* Title spec */}
      <div className="flex items-center gap-1.5 mb-4 text-[10px] font-mono tracking-[0.2em] text-[#C0C0C0]/50 uppercase">
        <Sliders className="w-3 h-3 text-[#C0C0C0]" />
        <span>Tactical Frequency Mode Selector</span>
      </div>

      {/* Silver Capsule selector buttons matching design spec */}
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 w-full">
        {modes.map((m) => {
          const isActive = currentMode === m.id;
          return (
            <motion.button
              key={m.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(m.id)}
              className={`px-4 sm:px-6 py-2 border rounded-full text-[11px] sm:text-[12px] tracking-widest uppercase transition-all duration-300 font-display cursor-pointer ${
                isActive
                  ? 'border-[#C0C0C0] text-white bg-black/60 shadow-[0_0_15px_rgba(192,192,192,0.15)] font-bold'
                  : 'border-[#C0C0C020] text-[#C0C0C060] bg-transparent hover:text-white hover:border-[#C0C0C040]'
              }`}
            >
              {m.name}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
