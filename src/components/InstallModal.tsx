/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Smartphone, 
  Chrome, 
  Share2, 
  PlusSquare, 
  Download, 
  FileCode, 
  AppWindow, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { synth } from '../utils/audio';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Outer Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-[#020702] border-2 border-[#C0C0C0]/40 rounded-[32px] p-6 relative overflow-hidden text-white z-10 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(57,255,20,0.15)] max-h-[90vh] overflow-y-auto"
        >
          {/* Top subtle highlight lines */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#39FF14]/50 to-transparent" />

          {/* Close button */}
          <button
            onClick={() => { synth.playClick(); onClose(); }}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 mt-1">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#006400]/25 border border-[#C0C0C040] mb-3">
              <Smartphone className="w-7 h-7 text-[#39FF14]" />
            </div>
            <h3 className="font-display font-black text-lg sm:text-xl tracking-wide uppercase text-white">
              Sakinisha App kwenye Simu
            </h3>
            <p className="text-[9px] font-mono tracking-widest text-[#C0C0C0]/60 uppercase mt-1">
              PWA MOBILE PLATFORM SYSTEM INSTALL
            </p>
          </div>

          <div className="space-y-4">
            
            {/* OPTION 1: HOME SCREEN INSTALL (PWA format - most recommended) */}
            <div className="bg-black/55 border border-[#C0C0C015] rounded-2.5xl p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <AppWindow className="w-4 h-4 text-[#39FF14]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#39FF14]">
                  Njia ya 1: Weka kwenye Home Screen (Inayopendekezwa)
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-normal">
                Hii inabadilisha mtandao huu kuwa App kamili kwenye simu yako yenye icon, bila kupoteza nafasi (storage) na inafanya kazi haraka sana!
              </p>

              {/* Android steps */}
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  <Chrome className="w-3.5 h-3.5 text-amber-500" />
                  <span>KWA SIMU ZA ANDROID (CHROME):</span>
                </div>
                <ul className="text-[10px] text-zinc-300 space-y-1 pl-1 list-decimal list-inside leading-relaxed font-sans">
                  <li>Bonyeza alama ya nukta tatu <strong className="text-white">(⋮)</strong> iliyoko kona ya juu kulia ya browser ya Chrome.</li>
                  <li>Chagua maelezo ya <strong className="text-white">"Ongeza kwenye Skrini ya Nyumbani" (Add to Home screen)</strong> au <strong className="text-[#39FF14]">"Sakinisha Programu" (Install app)</strong>.</li>
                  <li>Hakikisha na ubonyeze <strong>"Ongeza" (Add)</strong>. App itatokea kwenye skrini yako ya simu na unaweza kuitumia kama Programu zingine zote!</li>
                </ul>
              </div>

              {/* iPhone steps */}
              <div className="space-y-2 pt-2.5 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>KWA SIMU ZA IPHONE (SAFARI):</span>
                </div>
                <ul className="text-[10px] text-zinc-300 space-y-1 pl-1 list-decimal list-inside leading-relaxed font-sans">
                  <li>Hakikisha umefungua website hii kwa kutumia browser ya <strong className="text-white">Safari</strong> ya iPhone yako.</li>
                  <li>Bonyeza kitufe cha <strong className="text-white">"Kushiriki" (Share / Arrow icon)</strong> chini katikati ya screen.</li>
                  <li>Tafuta na ubonyeze kitufe cha <strong className="text-[#39FF14]">"Ongeza kwenye Skrini ya Nyumbani" (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline text-[#39FF14]" />.</li>
                  <li>Bonyeza <strong>"Add"</strong> juu kulia na tayari utapata icon ya Betpawa Signal kwenye simu yako!</li>
                </ul>
              </div>
            </div>

            {/* OPTION 2: COMPILING AS ANDROID APK FILE */}
            <div className="bg-black/55 border border-[#C0C0C015] rounded-2.5xl p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <FileCode className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-500">
                  Njia ya 2: Pakua Code kutengeneza APK (.apk)
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-normal">
                Ukitaka kuipata programu hii kama faili maalumu la <strong>.APK</strong> la kuisakinisha moja kwa moja au kuuza kwa wateja (Android installation):
              </p>

              <div className="text-[10px] space-y-2 text-zinc-300 font-mono">
                <div className="flex gap-2">
                  <div className="h-4 w-4 rounded bg-zinc-900 border border-zinc-800 text-yellow-500 text-center text-[9px] font-bold">1</div>
                  <p className="leading-snug">
                    Bonyeza Kitufe cha <strong>Settings</strong> juu kulia kwenye AI Studio (Kona ya juu ya screen yako ya coding).
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="h-4 w-4 rounded bg-zinc-900 border border-zinc-800 text-yellow-500 text-center text-[9px] font-bold">2</div>
                  <p className="leading-snug">
                    Chagua kifaa cha <span className="text-[#39FF14] font-bold">"Export to ZIP"</span> ili kupakua faili zote za app hii kwenye kompyuta au simu yako.
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="h-4 w-4 rounded bg-zinc-900 border border-zinc-800 text-yellow-500 text-center text-[9px] font-bold">3</div>
                  <p className="leading-snug">
                    Ingiza faili hizo kwenye huduma ya bure kama <a href="https://gonative.io" target="_blank" rel="noreferrer" className="text-blue-400 underline">gonative.io</a>, <a href="https://capacitorjs.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">Capacitor JS</a>, au template yoyote ya WebView ili kuzalisha Android APK ndani ya sekunde 60 pekee!
                  </p>
                </div>
              </div>
            </div>

            {/* Quick confirmation check */}
            <div className="py-2 px-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-center">
              <span className="text-[9.5px] font-bold text-[#39FF14] flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider">
                <CheckCircle className="w-3.5 h-3.5 text-[#39FF14]" />
                Mfumo umeandaliwa kwa matumizi ya simu ya mkononi kikamilifu.
              </span>
            </div>

          </div>

          <button
            onClick={() => { synth.playClick(); onClose(); }}
            className="w-full mt-5 py-3 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-950 border border-[#C0C0C040] hover:border-white text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors text-center block"
          >
            Funga Dirisha hili
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
