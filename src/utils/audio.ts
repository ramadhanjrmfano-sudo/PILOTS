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
}

export const synth = new AudioSynth();
