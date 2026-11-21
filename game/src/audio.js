// Tiny WebAudio synth: no audio files. Blips, cash, gunshot, crash, and a siren wail.
let ctx = null, sirenOsc = null, sirenGain = null, muted = false;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function toggleMute() { muted = !muted; if (muted) stopSiren(); return muted; }
export function isMuted() { return muted; }
function tone(freq, dur, type = 'square', vol = 0.08, slide = 0) {
  const c = ac(); if (!c || muted) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
}
export function blip() { tone(660, 0.07, 'square', 0.05); }
export function cashSound() { tone(880, 0.09, 'square', 0.06); setTimeout(() => tone(1320, 0.14, 'square', 0.06), 70); }
export function gunSound() {
  const c = ac(); if (!c || muted) return;
  const len = c.sampleRate * 0.12, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const g = c.createGain(); g.gain.value = 0.18;
  src.connect(g).connect(c.destination); src.start();
}
export function crashSound() { tone(90, 0.25, 'sine', 0.22, -50); }
export function bustedSound() { tone(392, 0.2, 'triangle', 0.1); setTimeout(() => tone(311, 0.35, 'triangle', 0.1), 180); }
export function setSiren(on, t) {
  const c = ac(); if (!c || muted) { stopSiren(); return; }
  if (on && !sirenOsc) {
    sirenOsc = c.createOscillator(); sirenGain = c.createGain();
    sirenOsc.type = 'triangle'; sirenGain.gain.value = 0.035;
    sirenOsc.connect(sirenGain).connect(c.destination); sirenOsc.start();
  }
  if (sirenOsc) sirenOsc.frequency.value = 700 + Math.sin(t * 5.2) * 220;
  if (!on) stopSiren();
}
function stopSiren() { if (sirenOsc) { try { sirenOsc.stop(); } catch { /* already stopped */ } sirenOsc = null; sirenGain = null; } }
