// Fists and a simple pistol: muzzle flash, a tracer, things fall over. Light, no gore.
import { gunSound } from './audio.js';
import { addCrime } from './police.js';
import { scarePeds } from './pedestrians.js';

export function tryAttack(g, wx, wy) {
  const p = g.player;
  if (p.car || g.time - (g.lastShot || -9) < 0.22) return;
  g.lastShot = g.time;
  const dx = wx - p.x, dy = wy - p.y, d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  // Punch range first.
  for (const ped of g.peds) {
    if (ped.state !== 'down' && (ped.x - p.x) ** 2 + (ped.y - p.y) ** 2 < 42 * 42 &&
        (ped.x - p.x) * ux + (ped.y - p.y) * uy > 0) {
      ped.state = 'down'; ped.down = 5;
      addCrime(g, 1, p.x, p.y); scarePeds(g, p.x, p.y, 190);
      g.effects.push({ kind: 'pow', x: ped.x, y: ped.y - 16, until: g.time + 0.3 });
      return;
    }
  }
  gunSound();
  g.effects.push({ kind: 'flash', x: p.x + ux * 16, y: p.y + uy * 16, until: g.time + 0.06 });
  const range = 460;
  let hx = p.x + ux * range, hy = p.y + uy * range, hitT = range;
  for (const ped of g.peds) {
    if (ped.state === 'down') continue;
    const t = (ped.x - p.x) * ux + (ped.y - p.y) * uy;
    if (t < 0 || t > hitT) continue;
    const px = p.x + ux * t, py = p.y + uy * t;
    if ((ped.x - px) ** 2 + (ped.y - py) ** 2 < 13 * 13) { hitT = t; hx = px; hy = py; ped.state = 'down'; ped.down = 6; }
  }
  for (const car of g.cars) {
    if (car.dead) continue;
    const t = (car.x - p.x) * ux + (car.y - p.y) * uy;
    if (t < 0 || t > hitT) continue;
    const px = p.x + ux * t, py = p.y + uy * t;
    if ((car.x - px) ** 2 + (car.y - py) ** 2 < 24 * 24) { hitT = t; hx = px; hy = py; car.health = Math.max(0, car.health - 26); }
  }
  g.effects.push({ kind: 'tracer', x: p.x + ux * 16, y: p.y + uy * 16, x2: hx, y2: hy, until: g.time + 0.07 });
  addCrime(g, 1, p.x, p.y);
  scarePeds(g, p.x, p.y, 260);
}
export function drawEffects(ctx, g) {
  for (const e of g.effects) {
    if (e.kind === 'tracer') {
      ctx.strokeStyle = 'rgba(255,240,170,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x2, e.y2); ctx.stroke();
    } else if (e.kind === 'flash') {
      ctx.fillStyle = 'rgba(255,200,60,0.9)';
      ctx.beginPath(); ctx.arc(e.x, e.y, 7, 0, Math.PI * 2); ctx.fill();
    } else if (e.kind === 'pow') {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('POW!', e.x, e.y);
    }
  }
}
