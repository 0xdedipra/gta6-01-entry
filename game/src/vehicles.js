// Cars: parked cars, grid-following traffic, arcade driving physics, drawing.
// A car is { x, y, angle, speed, color, kind, health, laneAxis, dir, lane }.
import { ROAD_HALF, VX, HY, WORLD_W, BEACH_Y, CAR_TOP, CAR_REVERSE, COLORS } from './config.js';
import { mulberry32, pick, range } from './random.js';
import { circleHitsBuilding, pointSolid } from './world.js';

export function makeCar(x, y, angle, color, kind = 'traffic') {
  return { x, y, angle, speed: 0, color, kind, health: 100, laneAxis: null, dir: 1, lane: 0, dead: false, flash: Math.random() * 6 };
}
export function spawnTraffic(seed, count) {
  const rng = mulberry32(seed ^ 0x9e37);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng() > 0.45;
    const dir = rng() > 0.5 ? 1 : -1;
    const lane = (rng() > 0.5 ? 1 : -1) * 29;
    if (vertical) {
      const cx = pick(rng, VX);
      cars.push(Object.assign(makeCar(cx + (dir > 0 ? -lane * -1 : lane), range(rng, 80, BEACH_Y - 120), dir > 0 ? Math.PI / 2 : -Math.PI / 2, pick(rng, COLORS.carPaint)), { laneAxis: 'y', dir, lane }));
    } else {
      const cy = pick(rng, HY);
      cars.push(Object.assign(makeCar(range(rng, 80, WORLD_W - 80), cy + (dir > 0 ? lane : -lane), dir > 0 ? 0 : Math.PI, pick(rng, COLORS.carPaint)), { laneAxis: 'x', dir, lane }));
    }
  }
  return cars;
}
export function spawnParked(seed, count) {
  const rng = mulberry32(seed ^ 0x51ab);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng() > 0.5;
    if (vertical) {
      const cx = pick(rng, VX);
      cars.push(Object.assign(makeCar(cx + (rng() > 0.5 ? 1 : -1) * (ROAD_HALF - 16), range(rng, 90, BEACH_Y - 100), Math.PI / 2, pick(rng, COLORS.carPaint), 'parked'), {}));
    } else {
      const cy = pick(rng, HY);
      cars.push(Object.assign(makeCar(range(rng, 90, WORLD_W - 90), cy + (rng() > 0.5 ? 1 : -1) * (ROAD_HALF - 16), 0, pick(rng, COLORS.carPaint), 'parked'), {}));
    }
  }
  return cars;
}
// Is there a car (or the player) just ahead of this traffic car?
function blockedAhead(g, car, dist) {
  const fx = car.x + Math.cos(car.angle) * dist, fy = car.y + Math.sin(car.angle) * dist;
  for (const o of g.cars) {
    if (o === car || o.dead) continue;
    if ((o.x - fx) ** 2 + (o.y - fy) ** 2 < 34 * 34) return true;
  }
  const p = g.player;
  if (p.car !== car && (p.x - fx) ** 2 + (p.y - fy) ** 2 < 32 * 32) return true;
  return false;
}
export function updateTraffic(g, car, dt) {
  if (car.kind !== 'traffic' || car.dead) return;
  const cruise = 120 + (car.flash % 3) * 22;
  const blocked = blockedAhead(g, car, 62);
  car.speed = Math.max(0, Math.min(cruise, car.speed + (blocked ? -260 : 90) * dt));
  if (blocked && car.speed < 4) car.speed = 0;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // At an intersection, sometimes turn onto the crossing road.
  const nearV = VX.some((cx) => Math.abs(nx - cx) < 8), nearH = HY.some((cy) => Math.abs(ny - cy) < 8);
  if (car.laneAxis === 'y' && nearH && Math.abs(ny - Math.round(ny)) >= 0 && g.rng() < dt * 0.55) {
    const cy = HY.reduce((a, b) => (Math.abs(b - ny) < Math.abs(a - ny) ? b : a));
    car.y = cy + (car.dir > 0 ? 29 : -29) * (car.angle > 0 ? 1 : -1) * 0 + (car.lane >= 0 ? 29 : -29);
    car.laneAxis = 'x'; car.angle = car.dir > 0 ? 0 : Math.PI;
    if (car.angle === Math.PI) car.y = cy - 29; else car.y = cy + 29;
    return;
  }
  if (car.laneAxis === 'x' && nearV && g.rng() < dt * 0.55) {
    const cx = VX.reduce((a, b) => (Math.abs(b - nx) < Math.abs(a - nx) ? b : a));
    car.laneAxis = 'y'; car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    car.x = car.angle > 0 ? cx + 29 : cx - 29;
    return;
  }
  if (pointSolid(g.city, nx, ny, true) || ny > BEACH_Y + 90) { car.speed = 0; car.angle += Math.PI; car.dir *= -1; return; }
  car.x = nx; car.y = ny;
  if (car.x < 30 || car.x > WORLD_W - 30 || car.y < 30) { car.angle += Math.PI; car.dir *= -1; car.x = Math.max(30, Math.min(WORLD_W - 30, car.x)); car.y = Math.max(30, car.y); }
}
// Arcade driving for the player's car. Returns true if it crashed this frame.
export function driveCar(g, car, dt, input) {
  const accel = car.health <= 0 ? 0 : 340;
  if (input.up) car.speed += accel * dt;
  else if (input.down) car.speed -= (car.speed > 10 ? 420 : 200) * dt;
  else car.speed -= car.speed * 0.7 * dt;
  car.speed = Math.max(-CAR_REVERSE, Math.min(CAR_TOP * (0.35 + 0.65 * car.health / 100), car.speed));
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  if (Math.abs(car.speed) > 4) car.angle += steer * 1.9 * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 160);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  let crashed = false;
  if (circleHitsBuilding(g.city, nx, ny, 17) || pointSolid(g.city, nx, ny, true)) {
    crashed = Math.abs(car.speed) > 130;
    if (crashed) { car.health = Math.max(0, car.health - Math.abs(car.speed) * 0.045); }
    car.speed = -car.speed * 0.25;
  } else { car.x = nx; car.y = ny; }
  // Bump other cars gently.
  for (const o of g.cars) {
    if (o === car || o.dead) continue;
    const d2 = (o.x - car.x) ** 2 + (o.y - car.y) ** 2;
    if (d2 < 36 * 36 && d2 > 0.01) {
      const d = Math.sqrt(d2), push = (36 - d) / 2;
      o.x += (o.x - car.x) / d * push; o.y += (o.y - car.y) / d * push;
      if (Math.abs(car.speed) > 150) { o.health = Math.max(0, o.health - 12); car.health = Math.max(0, car.health - 5); crashed = true; }
    }
  }
  return crashed;
}
export function drawCar(ctx, car, t) {
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-19, -9, 42, 22);
  ctx.fillStyle = car.kind === 'police' ? '#e8e8ec' : car.color;
  ctx.beginPath(); ctx.roundRect(-21, -11, 42, 22, 6); ctx.fill();
  if (car.kind === 'police') { ctx.fillStyle = '#1c1c22'; ctx.fillRect(-21, -11, 15, 22); ctx.fillRect(8, -11, 13, 22); }
  ctx.fillStyle = '#bfe6f5'; ctx.fillRect(-4, -8, 10, 16); ctx.fillRect(-14, -8, 6, 16);
  ctx.fillStyle = '#14141a';
  for (const [wx, wy] of [[-14, -12], [13, -12], [-14, 10], [13, 10]]) ctx.fillRect(wx, wy, 8, 4);
  ctx.fillStyle = '#ffe9a8'; ctx.fillRect(19, -8, 3, 5); ctx.fillRect(19, 3, 3, 5);
  ctx.fillStyle = '#ff5a5a'; ctx.fillRect(-22, -8, 3, 5); ctx.fillRect(-22, 3, 3, 5);
  if (car.kind === 'police') {
    const on = Math.sin(t * 14 + car.flash) > 0;
    ctx.fillStyle = on ? '#ff3b30' : '#3b82f6';
    ctx.fillRect(-6, -9, 12, 5);
    ctx.fillStyle = on ? '#3b82f6' : '#ff3b30';
    ctx.fillRect(-6, 4, 12, 5);
    ctx.fillStyle = on ? 'rgba(255,59,48,0.25)' : 'rgba(59,130,246,0.25)';
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
  }
  if (car.marked) {
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 30 + Math.sin(t * 6) * 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  if (car.health < 55 && !car.dead) {
    ctx.fillStyle = `rgba(60,60,60,${0.35 + 0.3 * Math.sin(t * 9 + car.x)})`;
    ctx.beginPath(); ctx.arc(car.x + 12, car.y - 4, 6 + (55 - car.health) * 0.12, 0, Math.PI * 2); ctx.fill();
    if (car.health < 25) { ctx.fillStyle = 'rgba(40,40,40,0.5)'; ctx.beginPath(); ctx.arc(car.x + 16, car.y + 2, 10, 0, Math.PI * 2); ctx.fill(); }
  }
  if (car.health <= 0) car.dead = true;
}
