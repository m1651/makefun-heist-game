// Tiny synthesised sounds for The Midnight Vault, made with WebAudio — no files.
// A soft chime for loot, a low alarm pulse while spotted, a sting when caught,
// and a bright arpeggio for a clean getaway. Silence is fine if audio is blocked.
export function createSound() {
  let ctx = null;
  function audio() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, gain, when = 0) {
    const ac = audio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ac.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(ac.currentTime + when);
    osc.stop(ac.currentTime + when + dur);
  }
  return {
    pickup() { tone(880, 0.12, 'sine', 0.12); tone(1318, 0.18, 'sine', 0.1, 0.07); },
    coin() { tone(1200, 0.08, 'triangle', 0.1); },
    spotted() { tone(220, 0.25, 'sawtooth', 0.08); tone(180, 0.25, 'sawtooth', 0.08, 0.18); },
    caught() { tone(160, 0.4, 'sawtooth', 0.14); tone(110, 0.5, 'sawtooth', 0.14, 0.2); },
    clear() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'sine', 0.12, i * 0.09)); },
  };
}
