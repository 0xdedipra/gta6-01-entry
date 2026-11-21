// Pedestrians: sidewalk strollers who flee screaming when crime happens near them.
import { ROAD_HALF, VX, HY, WORLD_W, BEACH_Y } from './config.js';
import { mulberry32, pick, range } from './random.js';
import { pointSolid } from './world.js';

const SKIN = ['#f2c79b', '#c68863', '#8d5a3b', '#ffdbac'];
const SHIRT = ['#ef476f', '#06d6a0', '#118ab2', '#ffd166', '#9b5de5', '#f15bb5', '#00bbf9'];
export function spawnPeds(seed, count) {
  const rng = mulberry32(seed ^ 0x77c1);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng() > 0.4;
    const side = rng() > 0.5 ? 1 : -1;
    let x, y;
    if (vertical) { x = pick(rng, VX) + side * (ROAD_HALF + 13); y = range(rng, 60, BEACH_Y - 40); }
    else { y = pick(rng, HY) + side * (ROAD_HALF + 13); x = range(rng, 60, WORLD_W - 60); }
    peds.push({
      x, y, angle: rng() * Math.PI * 2, speed: range(rng, 26, 48), color: pick(rng, SHIRT), skin: pick(rng, SKIN),
      state: 'walk', panic: 0, down: 0, turnT: range(rng, 1, 4), phase: rng() * 6,
    });
  }
  return peds;
}
export function scarePeds(g, x, y, radius) {
  for (const p of g.peds) {
    if (p.state === 'down') continue;
    if ((p.x - x) ** 2 + (p.y - y) ** 2 < radius * radius) { p.state = 'flee'; p.panic = range(g.rng, 1.6, 3); }
  }
}
export function updatePeds(g, dt) {
  for (const p of g.peds) {
    if (p.state === 'down') { p.down -= dt; if (p.down <= 0) { p.state = 'walk'; } continue; }
    if (p.state === 'flee') {
      p.panic -= dt;
      const dx = p.x - g.threat.x, dy = p.y - g.threat.y, d = Math.hypot(dx, dy) || 1;
      p.angle = Math.atan2(dy, dx);
      const sp = 165;
      const nx = p.x + Math.cos(p.angle) * sp * dt, ny = p.y + Math.sin(p.angle) * sp * dt;
      if (!pointSolid(g.city, nx, ny)) { p.x = nx; p.y = ny; } else { p.angle += 1.7 * dt; }
      if (p.panic <= 0) p.state = 'walk';
      continue;
    }
    p.turnT -= dt;
    if (p.turnT <= 0) { p.turnT = range(g.rng, 1.5, 4.5); p.angle += range(g.rng, -1.4, 1.4); }
    const nx = p.x + Math.cos(p.angle) * p.speed * dt, ny = p.y + Math.sin(p.angle) * p.speed * dt;
    if (pointSolid(g.city, nx, ny) || ny > BEACH_Y + 110) { p.angle += Math.PI * 0.9; }
    else { p.x = nx; p.y = ny; }
    // A fast car nearby is scary even without a crime.
    const pl = g.player;
    if (pl.car && Math.abs(pl.car.speed) > 200 && (p.x - pl.x) ** 2 + (p.y - pl.y) ** 2 < 110 * 110) {
      p.state = 'flee'; p.panic = 1.4; g.threat = { x: pl.x, y: pl.y };
    }
  }
}
export function drawPed(ctx, p, t) {
  ctx.save(); ctx.translate(p.x, p.y);
  if (p.state === 'down') {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = p.color; ctx.fillRect(-9, -4, 18, 8);
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(13, 0, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); return;
  }
  const bob = Math.sin(t * 9 + p.phase) * 1.6;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 8, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2b3a'; ctx.fillRect(-4.5, 1 + bob * 0.3, 3.6, 8); ctx.fillRect(1, 1 - bob * 0.3, 3.6, 8);
  ctx.fillStyle = p.color; ctx.beginPath(); ctx.roundRect(-6, -6, 12, 10, 3); ctx.fill();
  ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(0, -9.5, 4.6, 0, Math.PI * 2); ctx.fill();
  if (p.state === 'flee') {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('!', 0, -20 + Math.sin(t * 12) * 2);
  }
  ctx.restore();
}
