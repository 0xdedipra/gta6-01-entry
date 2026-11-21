// audio.js — tiny WebAudio synth: weapon shots, reload, cash, crashes and a
// two-tone police siren. Everything is generated; there are no audio files.
let actx = null, sirenNodes = null, muted = false;

function ac() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}

export function toggleMute() { muted = !muted; if (muted) stopSiren(); return muted; }

function tone(freq, dur, type = 'square', vol = 0.06, slideTo = 0) {
  if (muted) return;
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start(); o.stop(a.currentTime + dur);
}

function noiseBurst(dur, vol, freq) {
  if (muted) return;
  const a = ac(); if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export function shotSound(kind) {
  if (kind === 'smg') noiseBurst(0.07, 0.16, 2600);
  else if (kind === 'shotgun') noiseBurst(0.22, 0.3, 1100);
  else if (kind === 'rifle') { noiseBurst(0.16, 0.26, 1800); tone(140, 0.12, 'sawtooth', 0.05, 60); }
  else if (kind === 'fists') noiseBurst(0.05, 0.08, 700);
  else noiseBurst(0.1, 0.2, 2000); // pistol
}
export function dryFire() { tone(1200, 0.04, 'square', 0.04); }
export function reloadSound() { tone(500, 0.05, 'square', 0.05); setTimeout(() => tone(760, 0.06, 'square', 0.05), 130); }
export function cashSound() { tone(880, 0.09, 'square', 0.06); setTimeout(() => tone(1320, 0.15, 'square', 0.06), 75); }
export function pickupSound() { tone(660, 0.07, 'triangle', 0.07); setTimeout(() => tone(990, 0.1, 'triangle', 0.07), 60); }
export function crashSound() { noiseBurst(0.2, 0.22, 500); tone(85, 0.25, 'sine', 0.2, 45); }
export function bustedSound() { tone(392, 0.2, 'triangle', 0.09); setTimeout(() => tone(311, 0.4, 'triangle', 0.09), 190); }
export function hornSound() { tone(370, 0.28, 'square', 0.07); tone(466, 0.28, 'square', 0.05); }

export function setSiren(on) {
  if (muted) on = false;
  const a = ac(); if (!a) return;
  if (on && !sirenNodes) {
    const o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
    o.type = 'triangle'; o.frequency.value = 780;
    lfo.type = 'square'; lfo.frequency.value = 0.9; lg.gain.value = 130;
    lfo.connect(lg).connect(o.frequency);
    g.gain.value = 0.018;
    o.connect(g).connect(a.destination);
    o.start(); lfo.start();
    sirenNodes = { o, lfo };
  } else if (!on && sirenNodes) {
    try { sirenNodes.o.stop(); sirenNodes.lfo.stop(); } catch { /* already stopped */ }
    sirenNodes = null;
  }
}
export function stopSiren() { setSiren(false); }
