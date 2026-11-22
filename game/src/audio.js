// audio.js — tiny synthesised sound effects with the Web Audio API.
// No audio files: every sound is an oscillator shaped in code, so the
// game loads nothing over the network and stays silent until the first
// key press (browsers require a user gesture before audio starts).
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    coin() { tone(880, 0.12, 'sine', 0.12); setTimeout(() => tone(1320, 0.16, 'sine', 0.12), 70); },
    loot() { tone(660, 0.1, 'triangle', 0.14); setTimeout(() => tone(990, 0.18, 'triangle', 0.14), 80); },
    alarm() { tone(220, 0.35, 'sawtooth', 0.08, 440); },
    caught() { tone(330, 0.5, 'sawtooth', 0.12, 110); },
    door() { tone(392, 0.12, 'sine', 0.12); setTimeout(() => tone(523, 0.2, 'sine', 0.12), 100); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.14), i * 120)); },
    click() { tone(1200, 0.05, 'square', 0.05); },
  };
}
