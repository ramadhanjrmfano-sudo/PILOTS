/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useAnimation } from 'motion/react';
import { Radio } from 'lucide-react';
import { synth } from '../utils/audio';

interface RequestButtonProps {
  onTrigger: () => void;
  disabled: boolean;
}

export const RequestButton: React.FC<RequestButtonProps> = ({ onTrigger, disabled }) => {
  const controls = useAnimation();

  const handlePress = () => {
    if (disabled) return;
    
    // Play the physical synthesizer feedback audio click
    synth.playClick();

    // Spring trigger press animation and scale shockwaves
    controls.start({
      scale: 0.94,
      transition: { duration: 0.08, ease: 'easeInOut' }
    }).then(() => {
      controls.start({
        scale: 1,
        transition: { type: 'spring', stiffness: 350, damping: 15 }
      });
    });

    onTrigger();
  };

  return (
    <div className="w-full relative mt-10 sm:mt-16 flex justify-center">
      {/* Absolute background glowing blur aura */}
      <div className="absolute -inset-1 sm:-inset-1.5 rounded-[24px] bg-gradient-to-r from-green-600 to-green-950 opacity-40 blur-md pointer-events-none transition-all duration-500" />

      <motion.button
        id="btn-request-signal"
        animate={controls}
        whileHover={{ y: disabled ? 0 : -2, scale: disabled ? 1 : 1.01 }}
        onClick={handlePress}
        disabled={disabled}
        className={`relative flex items-center justify-center w-full max-w-[400px] h-[75px] sm:h-[85px] rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.8)] outline-none border-2 transition-all duration-300 font-display select-none uppercase ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-neutral-950 border-neutral-800 text-neutral-500'
            : 'cursor-pointer hover:shadow-[0_15px_40px_rgba(57,255,20,0.25)] text-white border-[#C0C0C0] bg-gradient-to-b from-[#006400] to-[#003300]'
        }`}
      >
        {/* Shimmer sweep effect */}
        {!disabled && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[silver-shimmer_1.8s_infinite] pointer-events-none rounded-[22px]" />
        )}

        <div className="flex items-center gap-3">
          <Radio className={`w-5 h-5 ${disabled ? 'text-neutral-500' : 'text-neon-green animate-pulse'}`} />
          <span className="text-xl sm:text-2xl font-black tracking-[0.2em]">
            {disabled ? 'UPDATING...' : 'Request Signal'}
          </span>
        </div>
      </motion.button>
    </div>
  );
};
