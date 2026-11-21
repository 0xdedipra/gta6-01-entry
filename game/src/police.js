// Wanted stars, police spawning and chase AI, and the busted meter.
import { WORLD_W, BEACH_Y, COP_TOP } from './config.js';
import { makeCar } from './vehicles.js';
import { circleHitsBuilding, nearestRoadPoint } from './world.js';
import { range } from './random.js';

export function addCrime(g, stars, x, y) {
  g.wanted = Math.min(5, g.wanted + stars);
  g.heat = Math.max(g.heat, 4);           // seconds of "recent trouble" before decay can start
  g.threat = { x, y };
  g.lastCrimeAt = g.time;
}
export function updateWanted(g, dt) {
  g.heat -= dt;
  // Police "see" the player if any cop is within 430 units.
  const seen = g.cops.some((c) => !c.dead && (c.x - g.player.x) ** 2 + (c.y - g.player.y) ** 2 < 430 * 430);
  g.playerSeen = seen;
  if (g.wanted > 0 && g.heat <= 0) {
    g.decayT += dt * (seen ? 0.25 : 1);
    if (g.decayT > 11) { g.decayT = 0; g.wanted = Math.max(0, g.wanted - 1); }
  } else g.decayT = 0;
  // Keep the cop count matched to the wanted level.
  const want = g.wanted === 0 ? 0 : Math.min(2 + g.wanted, 6);
  g.copSpawnT -= dt;
  if (g.cops.filter((c) => !c.dead).length < want && g.copSpawnT <= 0) {
    g.copSpawnT = 2.2;
    const edge = g.rng() > 0.5 ? { x: g.rng() > 0.5 ? 40 : WORLD_W - 40, y: range(g.rng, 120, BEACH_Y - 80) }
                               : { x: range(g.rng, 120, WORLD_W - 120), y: 60 };
    const p = nearestRoadPoint(edge.x, edge.y);
    const cop = makeCar(p.x, p.y, 0, '#e8e8ec', 'police');
    cop.speed = 120; g.cops.push(cop); g.cars.push(cop);
  }
  if (g.wanted === 0) { g.cops.length = 0; g.cars = g.cars.filter((c) => c.kind !== 'police'); }
}
export function updateCops(g, dt) {
  const p = g.player;
  for (const cop of g.cops) {
    if (cop.dead) continue;
    const dx = p.x - cop.x, dy = p.y - cop.y, d = Math.hypot(dx, dy) || 1;
    const want = Math.atan2(dy, dx);
    let diff = want - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff * 3 * dt));
    const top = COP_TOP * (0.4 + 0.6 * cop.health / 100);
    cop.speed = Math.min(top, cop.speed + 300 * dt);
    if (d < 60) cop.speed = Math.min(cop.speed, Math.abs(p.car ? p.car.speed : 60) + 30);
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    if (circleHitsBuilding(g.city, nx, ny, 17)) { cop.speed *= 0.3; cop.angle += 0.9 * dt * (diff >= 0 ? 1 : -1); }
    else { cop.x = nx; cop.y = ny; }
    // Ram contact damages the player's ride a little.
    if (p.car && d < 38 && Math.abs(cop.speed) > 120) {
      p.car.health = Math.max(0, p.car.health - 9 * dt * 3);
      cop.speed *= 0.6;
    }
  }
  // Busted: a cop close by while the player is slow or on foot fills the meter.
  const closeCop = g.cops.some((c) => !c.dead && (c.x - p.x) ** 2 + (c.y - p.y) ** 2 < 95 * 95);
  const slow = !p.car || Math.abs(p.car.speed) < 45;
  if (g.wanted > 0 && closeCop && slow) g.busted = Math.min(1, g.busted + dt / 1.6);
  else g.busted = Math.max(0, g.busted - dt / 1.1);
}
