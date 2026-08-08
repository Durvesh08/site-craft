/**
 * Premium Tactile Sound Engine for ZOVAIX SITES
 * Inspired by Linear, Raycast, Arc Browser, Apple VisionOS, and macOS.
 * Synthesizes warm, organic micro-audio via low-latency Web Audio API with pitch randomization.
 */

class PremiumSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private masterVolume: number = 0.15; // 15% Master Volume

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("zovaix_sound_enabled");
      if (saved !== null) {
        this.enabled = saved === "true";
      }

      // Check reduced motion preference
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) {
        this.enabled = false;
      }
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== "undefined") {
      localStorage.setItem("zovaix_sound_enabled", String(val));
    }
  }

  // Micro randomization for organic human feel
  private getRandomFactor(variance: number = 0.05) {
    return 1 + (Math.random() * 2 - 1) * variance;
  }

  /**
   * Primary Button Click (18% vol)
   * Deep warm click with low-pass sub-transient & glass body.
   */
  public playPrimaryClick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const pitch = this.getRandomFactor(0.04);
      const vol = 0.18 * this.masterVolume * this.getRandomFactor(0.02);

      // Low transient sub body
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = "sine";
      sub.frequency.setValueAtTime(140 * pitch, now);
      sub.frequency.exponentialRampToValueAtTime(40, now + 0.035);

      subGain.gain.setValueAtTime(vol, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      // Low-pass filter for warmth
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, now);

      sub.connect(subGain);
      subGain.connect(filter);
      filter.connect(this.ctx.destination);

      sub.start(now);
      sub.stop(now + 0.035);
    } catch {
      // AudioContext policy
    }
  }

  /**
   * Secondary Button Click (12% vol)
   * Light high-frequency glass touch.
   */
  public playSecondaryClick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const pitch = this.getRandomFactor(0.05);
      const vol = 0.12 * this.masterVolume * this.getRandomFactor(0.02);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1100 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.025);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch {
      // Ignore
    }
  }

  /**
   * Toggle Switch (15% vol)
   * Soft mechanical magnetic tick.
   */
  public playToggle() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const pitch = this.getRandomFactor(0.03);
      const vol = 0.15 * this.masterVolume;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(550 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(950 * pitch, now + 0.03);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Ignore
    }
  }

  /**
   * Hover Shimmer (5% vol)
   * Ultra-subtle glass touch.
   */
  public playHoverShimmer() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const vol = 0.05 * this.masterVolume;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(2200, now + 0.015);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.015);
    } catch {
      // Ignore
    }
  }

  /**
   * Tab Switch (12% vol)
   * Fast crisp micro tick.
   */
  public playTabSwitch() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const pitch = this.getRandomFactor(0.03);
      const vol = 0.12 * this.masterVolume;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(750 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(450 * pitch, now + 0.02);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.02);
    } catch {
      // Ignore
    }
  }

  /**
   * Modal Open (10% vol)
   * Soft airy warm whoosh.
   */
  public playModalOpen() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const vol = 0.1 * this.masterVolume;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignore
    }
  }

  /**
   * Modal Close (10% vol)
   * Soft reverse low-pass whoosh.
   */
  public playModalClose() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const vol = 0.1 * this.masterVolume;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.07);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Ignore
    }
  }

  /**
   * Success Chime (22% vol)
   * Apple VisionOS / Apple Pay inspired warm harmonic triad (415Hz → 523Hz → 659Hz).
   */
  public playSuccess() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const vol = 0.22 * this.masterVolume;
      const notes = [415.3, 523.25, 659.25]; // Ab4, C5, E5 harmonic triad

      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.045);

        gain.gain.setValueAtTime(vol, now + i * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.045 + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.045);
        osc.stop(now + i * 0.045 + 0.14);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Error Tone (15% vol)
   * Muted low double tone. Never alarming.
   */
  public playError() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const vol = 0.15 * this.masterVolume;

      [220, 185].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(vol, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.1);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Input Focus (10% vol)
   * Micro crystal tick.
   */
  public playInputFocus() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const vol = 0.1 * this.masterVolume;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.015);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.015);
    } catch {
      // Ignore
    }
  }
}

export const soundEngine = new PremiumSoundEngine();
