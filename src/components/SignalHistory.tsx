/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SignalRequest } from '../types';
import { Ban, Radio, CheckCircle, Trash2 } from 'lucide-react';
import { synth } from '../utils/audio';

interface SignalHistoryProps {
  logs: SignalRequest[];
  onClear: () => void;
}

export const SignalHistory: React.FC<SignalHistoryProps> = ({ logs, onClear }) => {
  const handleClear = () => {
    synth.playClick();
    onClear();
  };

  return (
    <div className="w-full mt-8 bg-[#00640005] backdrop-blur-md border border-[#C0C0C030] rounded-[30px] p-5 sm:p-6 flex flex-col gap-3 relative overflow-hidden">
      
      {/* Title bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#C0C0C020]">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-neon-green animate-pulse" />
          <h4 className="font-display font-medium text-xs text-[#C0C0C0] tracking-[0.15em] uppercase">
            Signal Transmission Log
          </h4>
        </div>

        {logs.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-[9px] uppercase font-mono tracking-wider text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Wipe Log</span>
          </button>
        )}
      </div>

      {/* Log list */}
      <div className="max-h-40 overflow-y-auto pr-1 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-metallic-silver/40 flex flex-col items-center gap-2">
              <Ban className="w-4 h-4 text-metallic-silver/30" />
              <span>LOG EMPTY - RECORD TRANSMISSIONS</span>
            </div>
          ) : (
            logs.map((log) => {
              const isSuccess = log.status === 'READY';
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-black/60 border border-[#C0C0C015] font-mono text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#C0C0C0]/40">[{log.timestamp}]</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] uppercase tracking-wider text-metallic-silver/80">
                      {log.mode.replace('INTERVAL_', 'INT_')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`font-bold tracking-wider ${isSuccess ? 'text-white' : 'text-red-400'}`}>
                      {log.signalTime}
                    </span>
                    <div className="flex items-center gap-1.5 bg-neutral-900/60 px-2 py-0.5 rounded-full border border-white/5">
                      <CheckCircle className={`w-3 h-3 ${isSuccess ? 'text-[#39FF14]' : 'text-red-400'}`} />
                      <span className={`text-[8.5px] font-bold ${isSuccess ? 'text-[#39FF14]' : 'text-red-400'}`}>
                        {log.status === 'READY' ? 'DISPATCHED' : 'ERR'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Diagnostic telemetry signature line */}
      <div className="text-[8px] font-mono text-metallic-silver/35 text-right mt-1 tracking-widest uppercase">
        SECURE LINK ALPHA_9 // END-TO-END SIGNALS
      </div>
    </div>
  );
};
