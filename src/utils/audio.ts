/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynth {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('Audio click failed', e);
    }
  }

  playSuccess() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Main sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.35);

      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      // Add a metallic silver bell echo
      const oscBell = this.ctx.createOscillator();
      const gainBell = this.ctx.createGain();

      oscBell.type = 'triangle';
      oscBell.frequency.setValueAtTime(1860, now + 0.08);

      gainBell.gain.setValueAtTime(0.0, now);
      gainBell.gain.linearRampToValueAtTime(0.08, now + 0.1);
      gainBell.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      oscBell.connect(gainBell);
      gainBell.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);

      oscBell.start(now);
      oscBell.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio success failed', e);
    }
  }

  playError() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(120, now);
      osc1.frequency.linearRampToValueAtTime(80, now + 0.25);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(123, now);
      osc2.frequency.linearRampToValueAtTime(81, now + 0.25);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.25);
      osc2.start(now);
      osc2.stop(now + 0.25);
    } catch (e) {
      console.warn('Audio error failed', e);
    }
  }

  playAviatorCrash() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const flyAwayTime = 12.8; // flies away towards the end of 15 seconds

      // Master gain to keep sound comfortable, moderate, and pleasant
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.12, now); // Soft, non-startling volume
      masterGain.connect(this.ctx.destination);

      // 1. Soft progressive synth pluck arpeggio (The climbing multiplier sound of Spribe)
      // A gentle sequence of sine/triangle notes climbing up representing the plane rising
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98];
      
      for (let i = 0; i < 24; i++) {
        const noteTime = now + (i * 0.55);
        if (noteTime >= now + flyAwayTime) break;
        
        const pluckOsc = this.ctx.createOscillator();
        const pluckGain = this.ctx.createGain();
        
        pluckOsc.type = 'sine'; // Super warm, soft chime sound
        // Pick climbing notes from the scale
        const noteFreq = scale[i % scale.length];
        pluckOsc.frequency.setValueAtTime(noteFreq, noteTime);
        
        // Add a tiny glide upwards to simulate flying/climbing excitement
        pluckOsc.frequency.exponentialRampToValueAtTime(noteFreq * 1.04, noteTime + 0.25);
        
        pluckGain.gain.setValueAtTime(0, noteTime);
        pluckGain.gain.linearRampToValueAtTime(0.14, noteTime + 0.04);
        pluckGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);
        
        pluckOsc.connect(pluckGain);
        pluckGain.connect(masterGain);
        
        pluckOsc.start(noteTime);
        pluckOsc.stop(noteTime + 0.45);
      }

      // 2. Cozy, gentle engine hum (Combines Triangle and Sine layers, clean and low, no harsh sawtooth)
      const droneOsc = this.ctx.createOscillator();
      const droneGain = this.ctx.createGain();
      droneOsc.type = 'triangle';
      droneOsc.frequency.setValueAtTime(110, now); // A2 note
      droneOsc.frequency.linearRampToValueAtTime(185, now + flyAwayTime); // climb to F#3

      // Sub-frequency layer for comfortable warm fullness
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(55, now);
      subOsc.frequency.linearRampToValueAtTime(92.5, now + flyAwayTime);

      // Low frequency modulator for comfortable propeller spin pulsations
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(8, now); // 8Hz smooth spin
      lfoGain.gain.setValueAtTime(0.18, now);

      const pulseGain = this.ctx.createGain();
      pulseGain.gain.setValueAtTime(0.4, now);

      lfo.connect(lfoGain);
      lfoGain.connect(pulseGain.gain);

      droneOsc.connect(pulseGain);
      pulseGain.connect(droneGain);
      droneGain.connect(masterGain);

      subOsc.connect(subGain);
      subGain.connect(masterGain);

      // Envelopes to slide sound in smoothly and out before flight away
      droneGain.gain.setValueAtTime(0, now);
      droneGain.gain.linearRampToValueAtTime(0.18, now + 1.2);
      droneGain.gain.setValueAtTime(0.18, now + flyAwayTime - 0.4);
      droneGain.gain.linearRampToValueAtTime(0.001, now + flyAwayTime);

      subGain.gain.setValueAtTime(0, now);
      subGain.gain.linearRampToValueAtTime(0.12, now + 1.5);
      subGain.gain.setValueAtTime(0.12, now + flyAwayTime - 0.4);
      subGain.gain.linearRampToValueAtTime(0.001, now + flyAwayTime);

      lfo.start(now);
      droneOsc.start(now);
      subOsc.start(now);

      lfo.stop(now + flyAwayTime);
      droneOsc.stop(now + flyAwayTime);
      subOsc.stop(now + flyAwayTime);

      // 3. THE "FLEW AWAY" / COSMIC SWIPE CHIME (Starts at 12.8s, lasts for 2.2 seconds)
      const effectTime = now + flyAwayTime;

      // Sparkling starry whoosh (Gentle soft white noise sweep with lowpass resonance)
      const bufferSize = 2.2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;

      const sweptFilter = this.ctx.createBiquadFilter();
      sweptFilter.type = 'bandpass';
      sweptFilter.frequency.setValueAtTime(200, effectTime);
      sweptFilter.frequency.exponentialRampToValueAtTime(3200, effectTime + 1.4); // Sweeps high beautifully
      sweptFilter.Q.setValueAtTime(2.5, effectTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.setValueAtTime(0.05, effectTime); // low volume swoosh
      noiseGain.gain.exponentialRampToValueAtTime(0.001, effectTime + 2.0);

      noiseNode.connect(sweptFilter);
      sweptFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      noiseNode.start(effectTime);
      noiseNode.stop(effectTime + 2.2);

      // Golden Aviator Bubble Dings (Sweet Spribe signature success sounds at crash/flyaway)
      const chimeNotes = [523.25, 783.99, 1046.50, 1567.98]; // C5, G5, C6, G6 (Ascending pentatonic chimes)
      chimeNotes.forEach((freq, idx) => {
        const chimeStart = effectTime + (idx * 0.12);
        const chimeOsc = this.ctx.createOscillator();
        const chimeGainNode = this.ctx.createGain();

        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(freq, chimeStart);
        chimeOsc.frequency.exponentialRampToValueAtTime(freq * 1.1, chimeStart + 0.3); // lovely sliding upward

        chimeGainNode.gain.setValueAtTime(0, chimeStart);
        chimeGainNode.gain.linearRampToValueAtTime(0.12, chimeStart + 0.04);
        chimeGainNode.gain.exponentialRampToValueAtTime(0.001, chimeStart + 0.45);

        chimeOsc.connect(chimeGainNode);
        chimeGainNode.connect(masterGain);

        chimeOsc.start(chimeStart);
        chimeOsc.stop(chimeStart + 0.5);
      });

    } catch (e) {
      console.warn('Aviator crash sound failed', e);
    }
  }
}

export const synth = new AudioSynth();
