// The Mara Voss mission chain: steal & deliver, a checkpoint run, then a heat escape.
// Mission state lives on g.mission = { idx, phase, target, checkpoints, cpIdx, timeLeft }.
import { cashSound, blip } from './audio.js';

export const GARAGE = { x: 1030, y: 1000 };
export const HIDEOUT = { x: 2210, y: 1440 };
export const CHECKPOINTS = [
  { x: 570, y: 170 }, { x: 1770, y: 930 }, { x: 370, y: 1310 },
];
export function phone(g, from, text, dur = 5) {
  g.phone = { from, text, until: g.time + dur };
}
export function startMission(g, idx) {
  const m = { idx, phase: 'go', cpIdx: 0, timeLeft: 0 };
  g.mission = m;
  if (idx === 0) {
    m.phase = 'steal';
    phone(g, 'MARA VOSS', 'Welcome to Solmara. See the gold-ringed ride? Take it. Bring it to my garage.');
  } else if (idx === 1) {
    m.phase = 'run'; m.timeLeft = 95;
    phone(g, 'MARA VOSS', 'Hot run. Hit every beacon before the clock dies. Do not baby the car.');
  } else if (idx === 2) {
    m.phase = 'heat';
    phone(g, 'MARA VOSS', 'Last job: make some noise, get 3 stars, then lose them and reach the hideout.');
  }
}
export function missionTarget(g) {
  const m = g.mission;
  if (!m || m.idx >= 3) return null;
  if (m.idx === 0) return m.phase === 'steal' ? (g.markedCar ? { x: g.markedCar.x, y: g.markedCar.y } : null) : GARAGE;
  if (m.idx === 1) return CHECKPOINTS[m.cpIdx] || null;
  if (m.idx === 2) {
    if (m.phase === 'heat') return null;              // objective is the wanted level itself
    return HIDEOUT;
  }
  return null;
}
export function missionBanner(g) {
  const m = g.mission;
  if (!m || m.idx >= 3) return g.wanted > 0 ? 'Lay low — break line of sight to cool the heat' : 'Free roam — Solmara is yours';
  if (m.idx === 0) return m.phase === 'steal' ? 'FIRST WHEELS — steal the marked car' : 'FIRST WHEELS — deliver it to the garage';
  if (m.idx === 1) return `HOT RUN — reach the next checkpoint (${m.cpIdx + 1}/3) · ${Math.ceil(m.timeLeft)}s`;
  if (m.idx === 2) return m.phase === 'heat'
    ? (g.wanted >= 3 ? 'HEAT ESCAPE — now lose the police!' : `HEAT ESCAPE — raise the heat to 3 stars (${g.wanted}/3)`)
    : (g.wanted > 0 ? 'HEAT ESCAPE — lose the heat, then reach the hideout' : 'HEAT ESCAPE — reach the hideout');
  return '';
}
function pay(g, amount, nextText) {
  g.cash += amount; cashSound();
  phone(g, 'MARA VOSS', nextText);
  g.mission.idx += 1;
  if (g.mission.idx < 3) startMission(g, g.mission.idx);
  else { g.mission = { idx: 3, phase: 'done', cpIdx: 0, timeLeft: 0 }; g.cityOwned = true; }
  g.save();
}
export function updateMissions(g, dt) {
  const m = g.mission;
  if (!m || m.idx >= 3) return;
  const p = g.player;
  if (m.idx === 0) {
    if (m.phase === 'steal' && p.car && p.car === g.markedCar) {
      m.phase = 'deliver'; blip();
      phone(g, 'MARA VOSS', 'Good hands. Now bring it home — follow the gold marker.');
    } else if (m.phase === 'deliver' && p.car === g.markedCar && (p.x - GARAGE.x) ** 2 + (p.y - GARAGE.y) ** 2 < 70 * 70) {
      pay(g, 500, 'Clean work. $500 wired. Next: a little speed test.');
    }
  } else if (m.idx === 1) {
    m.timeLeft -= dt;
    const cp = CHECKPOINTS[m.cpIdx];
    if (cp && (p.x - cp.x) ** 2 + (p.y - cp.y) ** 2 < 78 * 78) {
      m.cpIdx += 1; blip(); g.cash += 100;
      if (m.cpIdx >= CHECKPOINTS.length) { pay(g, 800, 'Fast and loud. $800. One last job, the big one.'); return; }
    }
    if (m.timeLeft <= 0) { m.timeLeft = 95; m.cpIdx = 0; phone(g, 'MARA VOSS', 'Clock died. Resetting the run — go again.'); }
  } else if (m.idx === 2) {
    if (m.phase === 'heat' && g.wanted === 0 && g.heatWasRaised) m.phase = 'hideout';
    if (g.wanted >= 3) g.heatWasRaised = true;
    if (m.phase === 'hideout' && g.wanted === 0 && (p.x - HIDEOUT.x) ** 2 + (p.y - HIDEOUT.y) ** 2 < 80 * 80) {
      pay(g, 1500, 'Ice cold. $1500. Solmara is yours now, hotshot.');
    }
  }
}
export function drawMarker(ctx, x, y, t, label) {
  const bob = Math.sin(t * 3.2) * 6;
  ctx.fillStyle = 'rgba(255,210,63,0.16)';
  ctx.beginPath(); ctx.arc(x, y, 46 + Math.sin(t * 4) * 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.moveTo(x, y - 44 + bob); ctx.lineTo(x - 13, y - 70 + bob); ctx.lineTo(x + 13, y - 70 + bob); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.stroke();
  if (label) { ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, x, y - 80 + bob); }
}
