/**
 * audio.js - Web Audio API procedural sound engine
 * Zero dependencies, pure synthesized cozy vibes.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.lofiGain = null;
    this.isMuted = false;
    this.isLofiPlaying = false;
    this.lofiTimer = null;
    this.currentChordIndex = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();

    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Lo-fi channel gain
    this.lofiGain = this.ctx.createGain();
    this.lofiGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    this.lofiGain.connect(this.masterGain);
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : 0.7,
        this.ctx.currentTime,
        0.05
      );
    }
    return this.isMuted;
  }

  // --- Sound Effects ---

  /**
   * Cute bouncy pop sound for buttons & boops
   */
  playPop(freq = 440) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(freq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.12);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Sparkling bell chime for petal pluck & achievements
   */
  playChime(notes = [523.25, 659.25, 783.99, 1046.50]) { // C5, E5, G5, C6
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const startTime = now + idx * 0.08;
      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.8);
    });
  }

  /**
   * Gentle water trickle chime for watering the flower
   */
  playWaterChime() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const freqs = [880, 1174, 1318, 1760, 1567, 1975];
    const now = this.ctx.currentTime;

    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + i * 0.1);

      const startTime = now + i * 0.1;
      gain.gain.setValueAtTime(0.14, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  /**
   * Warm plush chord for flower blooming
   */
  playBloomChord() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    // Fmaj9: F3, A3, C4, E4, G4
    const chord = [174.61, 220.00, 261.63, 329.63, 392.00];
    const now = this.ctx.currentTime;

    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + 1.2);

      const delay = i * 0.06;
      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 2.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + 2.8);
    });
  }

  // --- Cozy Lo-Fi Chord Synthesizer ---

  toggleLofi() {
    this.ensureContext();
    if (this.isLofiPlaying) {
      this.stopLofi();
      return false;
    } else {
      this.startLofi();
      return true;
    }
  }

  startLofi() {
    this.isLofiPlaying = true;
    this.playLofiLoop();
  }

  stopLofi() {
    this.isLofiPlaying = false;
    if (this.lofiTimer) {
      clearTimeout(this.lofiTimer);
      this.lofiTimer = null;
    }
  }

  playLofiLoop() {
    if (!this.isLofiPlaying || !this.ctx) return;

    // Cozy jazz lofi progression:
    // Cmaj9 -> Am9 -> Dm9 -> G13 (in Hz)
    const progression = [
      [130.81, 196.00, 246.94, 293.66, 392.00], // Cmaj9
      [110.00, 164.81, 220.00, 261.63, 329.63], // Am9
      [146.83, 220.00, 261.63, 311.13, 392.00], // Dm9
      [98.00, 146.83, 196.00, 246.94, 329.63]   // G13
    ];

    const chord = progression[this.currentChordIndex];
    this.currentChordIndex = (this.currentChordIndex + 1) % progression.length;

    const now = this.ctx.currentTime;
    const chordDuration = 3.6; // seconds per chord

    // Play electric piano / Rhodes-like tone
    chord.forEach((freq, idx) => {
      // Main fundamental oscillator
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now); // soft 2nd harmonic

      // Warm low-pass filter for nostalgic muffled vintage vibe
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(650, now);
      filter.Q.setValueAtTime(1.2, now);

      // Stagger notes slightly like fingers brushing keys
      const strumm = idx * 0.04;
      const startTime = now + strumm;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.065, startTime + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + chordDuration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.lofiGain);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + chordDuration);
      osc2.stop(startTime + chordDuration);
    });

    // Schedule next chord
    this.lofiTimer = setTimeout(() => {
      this.playLofiLoop();
    }, (chordDuration - 0.2) * 1000);
  }
}

window.SoundEngine = SoundEngine;
