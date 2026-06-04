/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Shield } from 'lucide-react';

interface SignalCardProps {
  signalTime: string | null;
  statusText: string;
  isGenerating: boolean;
  modeLabel: string;
  systemClock: string;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signalTime,
  statusText,
  isGenerating,
  modeLabel,
  systemClock
}) => {
  const isReady = statusText === 'READY';
  const isNoSignal = statusText.includes('No more');

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full max-w-[550px] relative mt-6"
    >
      {/* Outer elegant background glow */}
      <div className="absolute -inset-1 rounded-[40px] bg-gradient-to-r from-[#006400]/20 via-[#C0C0C0]/10 to-[#39FF14]/10 opacity-40 blur-xl pointer-events-none" />

      {/* Main wide glassmorphism container configured precisely based on theme specs */}
      <div className="relative w-full bg-[#00640010] backdrop-blur-xl border border-[#C0C0C040] rounded-[40px] p-8 sm:p-12 shadow-[0_0_60px_rgba(192,192,192,0.1),inset_0_0_20px_rgba(0,100,0,0.2)] flex flex-col items-center overflow-hidden">
        
        {/* Silver Border Glow Effect */}
        <div className="absolute inset-0 border border-[#C0C0C020] rounded-[40px] pointer-events-none"></div>

        {/* Dynamic header mode label */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-black/60 rounded-full border border-metallic-silver/20 mb-4 self-center text-[9px] uppercase font-mono tracking-widest text-metallic-silver/70">
          <Cpu className="w-3 h-3 text-neon-green" />
          <span>{modeLabel}</span>
        </div>

        <span className="text-[#C0C0C0] uppercase tracking-[0.2em] text-xs sm:text-sm opacity-70 mb-4 font-display">
          Next Signal Time
        </span>

        <div className="relative h-24 flex items-center justify-center mb-8 w-full">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="calculating"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex items-center gap-2 font-mono text-[#39FF14] text-sm tracking-[0.2em]"
              >
                <span className="h-2 w-2 bg-[#39FF14] rounded-full animate-ping" />
                <span>CALCULATING VECTOR...</span>
              </motion.div>
            ) : (
              <motion.span
                key={signalTime || 'none'}
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(6px)' }}
                transition={{ duration: 0.3 }}
                className="font-mono font-bold text-5xl sm:text-6xl md:text-7xl text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
              >
                {signalTime || '-- : -- : --'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 w-full justify-between mt-2 px-1 sm:px-4">
          
          {/* Status block */}
          <div className="flex flex-col">
            <span className="text-[10px] text-[#C0C0C0] uppercase tracking-widest opacity-50 font-display">
              System Status
            </span>
            <div className="flex items-center gap-2 sm:gap-3 mt-1">
              <div className={`w-3 h-3 rounded-full ${
                isReady && !isGenerating
                  ? 'bg-[#39FF14] shadow-[0_0_12px_#39FF14] animate-pulse'
                  : isNoSignal
                  ? 'bg-red-600 shadow-[0_0_12px_#ef4444]'
                  : 'bg-yellow-500 shadow-[0_0_12px_#f59e0b]'
              }`} />
              <span className={`font-bold text-md sm:text-xl tracking-wider uppercase font-display ${
                isReady && !isGenerating
                  ? 'text-[#39FF14]'
                  : isNoSignal
                  ? 'text-red-500'
                  : 'text-yellow-400'
              }`}>
                {isGenerating ? 'CALC' : statusText}
              </span>
            </div>
          </div>

          <div className="h-12 w-[1px] bg-[#C0C0C030]" />

          {/* System digital realtime clock block */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#C0C0C0] uppercase tracking-widest opacity-50 font-display">
              System Clock
            </span>
            <span className="text-md sm:text-xl font-mono text-[#C0C0C0] mt-1 tracking-wider">
              {systemClock}
            </span>
          </div>

        </div>

        {/* Tactical Cash Out Strategy Panel with Target, Risk, and Martingale guidelines */}
        <div className="w-full mt-6 pt-5 border-t border-[#C0C0C020] flex flex-col items-center">
          <span className="text-[10px] text-emerald-400 uppercase tracking-[0.2em] font-mono font-bold animate-pulse">
            ★ Tactical Cash Out Strategy ★
          </span>
          <div className="grid grid-cols-2 gap-4 w-full mt-3">
            <div className="bg-black/45 border border-[#C0C0C020] rounded-2xl py-2 px-3 text-center shadow-inner">
              <span className="text-[9px] text-[#C0C0C0] uppercase font-mono tracking-wider opacity-60">Target</span>
              <div id="target-multiplier-value" className="text-lg sm:text-xl font-bold font-display text-white mt-0.5">3x</div>
            </div>
            <div className="bg-black/45 border border-[#C0C0C020] rounded-2xl py-2 px-3 text-center shadow-inner">
              <span className="text-[9px] text-red-400 uppercase font-mono tracking-wider opacity-90">Risk</span>
              <div className="text-lg sm:text-xl font-bold font-display text-red-500 mt-0.5">10x</div>
            </div>
          </div>
          <div className="mt-3 px-4 py-2 bg-[#39FF14]/10 border border-[#39FF14]/25 rounded-xl w-full text-center shadow-[0_0_15px_rgba(57,255,20,0.1)]">
            <span id="txt-martingale-rule" className="text-xs sm:text-sm font-semibold text-[#39FF14] tracking-wide font-mono uppercase">
              👉 Use Martingale rule 👈
            </span>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute right-3 bottom-3 opacity-[0.02] pointer-events-none">
          <Shield className="w-16 h-16 text-white" />
        </div>
      </div>
    </motion.div>
  );
};
