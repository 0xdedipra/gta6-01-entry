// Solmara Heat — boot, the game loop, camera, player, screens and save/load.
// A top-down open-world crime sandbox: walk, steal cars, run missions for
// Mara Voss, raise the heat, lose the heat.
import { WORLD_W, WORLD_H, SAVE_KEY, PLAYER_SPEED, PLAYER_SPRINT, COLORS } from './config.js';
import { mulberry32 } from './random.js';
import { buildCity, drawCity, pointSolid, circleHitsBuilding } from './world.js';
import { spawnTraffic, spawnParked, updateTraffic, driveCar, drawCar, makeCar } from './vehicles.js';
import { spawnPeds, updatePeds, drawPed, scarePeds } from './pedestrians.js';
import { addCrime, updateWanted, updateCops } from './police.js';
import { startMission, updateMissions, missionTarget, drawMarker, GARAGE } from './missions.js';
import { tryAttack, drawEffects } from './combat.js';
import { drawHUD } from './hud.js';
import { attachInput, keys, pressed, mouse, endFrame, axis } from './input.js';
import { setSiren, toggleMute, crashSound, bustedSound, blip } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const VW = canvas.width, VH = canvas.height;
const params = new URLSearchParams(location.search);
const SEED = Number(params.get('seed') || 7);
const SHOT = params.get('shot') || '';

function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}
function makeGame() {
  const city = buildCity(SEED);
  const cars = [...spawnTraffic(SEED, 15), ...spawnParked(SEED, 13)];
  const markedCar = cars.find((c) => c.kind === 'parked');
  markedCar.color = '#f5c542'; markedCar.marked = true;
  const g = {
    city, cars, cops: [], peds: spawnPeds(SEED, 30), markedCar,
    player: { x: 240, y: 240, angle: 0, car: null, radius: 11 },
    cam: { x: 0, y: 0 }, time: 0, rng: mulberry32(SEED ^ 0xabcd),
    cash: 120, health: 100, wanted: 0, heat: 0, decayT: 0, busted: 0,
    copSpawnT: 0, playerSeen: false, threat: { x: 0, y: 0 }, lastCrimeAt: -99,
    effects: [], phone: null, mission: null, heatWasRaised: false, cityOwned: false,
    screen: 'title', lastCopHit: -9, autoDrive: false,
    save() {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cash: g.cash, mission: g.mission ? g.mission.idx : 0 })); } catch { /* private mode */ }
    },
  };
  return g;
}
let g = makeGame();
attachInput(canvas);

function startPlay(fromSave) {
  g.screen = 'play';
  if (fromSave) {
    const s = loadSave();
    if (s) { g.cash = s.cash; startMission(g, Math.min(2, s.mission || 0)); if ((s.mission || 0) >= 3) { g.mission = { idx: 3, phase: 'done', cpIdx: 0, timeLeft: 0 }; g.cityOwned = true; } }
    else startMission(g, 0);
  } else if (!g.mission) startMission(g, 0);
}
function respawn(x, y) {
  g.player.x = x; g.player.y = y; g.player.car = null;
  g.wanted = 0; g.busted = 0; g.cops.length = 0;
  g.cars = g.cars.filter((c) => c.kind !== 'police');
}
function bustPlayer() {
  bustedSound();
  const fine = Math.min(g.cash, 150 + g.wanted * 100);
  g.cash -= fine; g.fine = fine;
  respawn(970, 930);
  g.screen = 'busted'; g.save();
}
function wastePlayer() {
  g.cash = Math.max(0, g.cash - 200);
  g.health = 100;
  respawn(570, 550);
  g.screen = 'wasted'; g.save();
}

// ---------- player ----------
function nearestCar(x, y, maxD) {
  let best = null, bd = maxD * maxD;
  for (const c of g.cars) {
    if (c.dead) continue;
    const d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function updatePlayer(dt) {
  const p = g.player;
  if (pressed.has('KeyE')) {
    if (p.car) {
      const c = p.car; p.car = null;
      p.x = c.x + Math.cos(c.angle + Math.PI / 2) * 26; p.y = c.y + Math.sin(c.angle + Math.PI / 2) * 26;
      if (pointSolid(g.city, p.x, p.y)) { p.x = c.x; p.y = c.y + 28; }
    } else {
      const c = nearestCar(p.x, p.y, 52);
      if (c) {
        p.car = c; c.speed = 0;
        if (!c.stolen) { c.stolen = true; addCrime(g, 1, p.x, p.y); scarePeds(g, p.x, p.y, 170); }
        blip();
      }
    }
  }
  if (p.car) {
    const c = p.car;
    const input = {
      up: g.autoDrive || keys.has('KeyW') || keys.has('ArrowUp'),
      down: keys.has('KeyS') || keys.has('ArrowDown'),
      left: keys.has('KeyA') || keys.has('ArrowLeft'),
      right: keys.has('KeyD') || keys.has('ArrowRight'),
    };
    const crashed = driveCar(g, c, dt, input);
    if (crashed) { crashSound(); g.health -= 5; scarePeds(g, c.x, c.y, 150); }
    p.x = c.x; p.y = c.y; p.angle = c.angle;
    // Running over cones is fine; running over people is not.
    for (const cone of g.city.cones) {
      if (!cone.hit && Math.abs(c.speed) > 40 && (cone.x - c.x) ** 2 + (cone.y - c.y) ** 2 < 24 * 24) cone.hit = true;
    }
    for (const ped of g.peds) {
      if (ped.state !== 'down' && Math.abs(c.speed) > 55 && (ped.x - c.x) ** 2 + (ped.y - c.y) ** 2 < 21 * 21) {
        ped.state = 'down'; ped.down = 7;
        addCrime(g, 2, c.x, c.y); scarePeds(g, c.x, c.y, 240);
        g.health -= 2;
      }
    }
    for (const cop of g.cops) {
      if (!cop.dead && (cop.x - c.x) ** 2 + (cop.y - c.y) ** 2 < 37 * 37 && Math.abs(c.speed) > 90 && g.time - g.lastCopHit > 1.2) {
        g.lastCopHit = g.time; addCrime(g, 2, c.x, c.y);
      }
    }
    if (c.health <= 0) { p.car = null; g.health = Math.min(g.health, 45); }
  } else {
    const a = axis();
    const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const sp = sprint ? PLAYER_SPRINT : PLAYER_SPEED;
    if (a.x || a.y) {
      const len = Math.hypot(a.x, a.y);
      const nx = p.x + (a.x / len) * sp * dt, ny = p.y + (a.y / len) * sp * dt;
      if (!pointSolid(g.city, nx, p.y)) p.x = nx;
      if (!pointSolid(g.city, p.x, ny)) p.y = ny;
      p.angle = Math.atan2(a.y, a.x);
    }
    const wx = g.cam.x + mouse.x, wy = g.cam.y + mouse.y;
    if (mouse.clicked || (mouse.down && g.time - (g.lastShot || -9) > 0.24)) tryAttack(g, wx, wy);
    if (mouse.down || a.x || a.y) p.aim = Math.atan2(wy - p.y, wx - p.x);
  }
}
function update(dt) {
  g.time += dt;
  updatePlayer(dt);
  for (const c of g.cars) updateTraffic(g, c, dt);
  updatePeds(g, dt);
  updateWanted(g, dt);
  updateCops(g, dt);
  updateMissions(g, dt);
  g.effects = g.effects.filter((e) => e.until > g.time);
  setSiren(g.wanted >= 2 && g.screen === 'play', g.time);
  if (g.busted >= 1) bustPlayer();
  if (g.health <= 0) wastePlayer();
  const tx = Math.max(0, Math.min(WORLD_W - VW, g.player.x - VW / 2));
  const ty = Math.max(0, Math.min(WORLD_H - VH, g.player.y - VH / 2));
  g.cam.x += (tx - g.cam.x) * Math.min(1, dt * 5);
  g.cam.y += (ty - g.cam.y) * Math.min(1, dt * 5);
}
// ---------- drawing ----------
function drawPlayer(ctx) {
  const p = g.player;
  if (p.car) return;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 8, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate((p.aim !== undefined ? p.aim : p.angle) + Math.PI / 2);
  ctx.fillStyle = '#243b53'; ctx.fillRect(-5, 2, 4, 9); ctx.fillRect(1, 2, 4, 9);
  ctx.fillStyle = COLORS.player; ctx.beginPath(); ctx.roundRect(-7, -6, 14, 12, 4); ctx.fill();
  ctx.fillStyle = '#f2c79b'; ctx.beginPath(); ctx.arc(0, -9, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222'; ctx.fillRect(5, -12, 12, 3.4);   // pistol arm
  ctx.restore();
}
function drawWorld() {
  ctx.fillStyle = '#14101d'; ctx.fillRect(0, 0, VW, VH);
  drawCity(ctx, g.city, g.cam, VW, VH, g.time);
  ctx.save(); ctx.translate(-g.cam.x, -g.cam.y);
  // Garage pad + glow.
  ctx.fillStyle = '#2f3542'; ctx.fillRect(GARAGE.x - 44, GARAGE.y - 30, 88, 60);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
  ctx.fillText("MARA'S GARAGE", GARAGE.x, GARAGE.y - 38);
  const tgt = g.screen === 'play' || g.screen === 'title' ? missionTarget(g) : null;
  if (tgt && g.mission && g.mission.idx === 0 && g.mission.phase === 'deliver') drawMarker(ctx, GARAGE.x, GARAGE.y, g.time, 'DELIVER');
  else if (tgt && g.mission && g.mission.idx === 1) drawMarker(ctx, tgt.x, tgt.y, g.time, 'CHECKPOINT');
  else if (tgt && g.mission && g.mission.idx === 2) drawMarker(ctx, tgt.x, tgt.y, g.time, 'HIDEOUT');
  for (const c of g.cars) drawCar(ctx, c, g.time);
  for (const ped of g.peds) drawPed(ctx, ped, g.time);
  drawPlayer(ctx);
  drawEffects(ctx, g);
  ctx.restore();
  // Direction arrow to the mission target at the screen edge.
  if (g.screen === 'play' && tgt) {
    const sx = tgt.x - g.cam.x, sy = tgt.y - g.cam.y;
    if (sx < 0 || sx > VW || sy < 0 || sy > VH) {
      const cx = Math.max(26, Math.min(VW - 26, sx)), cy = Math.max(70, Math.min(VH - 26, sy));
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(sy - VH / 2, sx - VW / 2));
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-8, -8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}
function overlay(alpha) { ctx.fillStyle = `rgba(10,8,20,${alpha})`; ctx.fillRect(0, 0, VW, VH); }
function bigTitle(text, y, size, color) {
  ctx.fillStyle = color; ctx.font = `900 ${size}px system-ui`; ctx.textAlign = 'center';
  ctx.fillText(text, VW / 2, y); ctx.textAlign = 'left';
}
function drawScreens() {
  if (g.screen === 'title') {
    overlay(0.45);
    bigTitle('SOLMARA HEAT', 240, 84, '#ffd23f');
    ctx.fillStyle = '#f3f4f6'; ctx.font = '19px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('One city. One fixer. Every car is yours — if you can lose the heat.', VW / 2, 292);
    ctx.font = '16px system-ui'; ctx.fillStyle = '#d1d5db';
    ctx.fillText('WASD walk & drive · Shift sprint · E steal / exit car · Click punch & shoot', VW / 2, 356);
    ctx.fillText('Missions from Mara Voss pay cash. Crimes raise your stars. Break line of sight to cool off.', VW / 2, 384);
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 22px system-ui';
    if (loadSave()) ctx.fillText('ENTER — continue      N — new game      Click — play', VW / 2, 470);
    else ctx.fillText('Press ENTER or click to play', VW / 2, 470);
    ctx.textAlign = 'left';
  } else if (g.screen === 'pause') {
    overlay(0.55); bigTitle('PAUSED', 330, 54, '#fff');
    ctx.fillStyle = '#d1d5db'; ctx.font = '17px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('P or Esc to resume · M toggles sound', VW / 2, 380); ctx.textAlign = 'left';
  } else if (g.screen === 'busted') {
    overlay(0.6); bigTitle('BUSTED', 320, 64, '#f87171');
    ctx.fillStyle = '#f3f4f6'; ctx.font = '19px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`The heat got you. Fine paid: $${g.fine || 0}. Your record is clean — for now.`, VW / 2, 372);
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 20px system-ui';
    ctx.fillText('Press ENTER to keep rolling', VW / 2, 424); ctx.textAlign = 'left';
  } else if (g.screen === 'wasted') {
    overlay(0.6); bigTitle('WASTED', 320, 64, '#f87171');
    ctx.fillStyle = '#f3f4f6'; ctx.font = '19px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('The clinic patched you up for $200. Solmara keeps spinning.', VW / 2, 372);
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 20px system-ui';
    ctx.fillText('Press ENTER to keep rolling', VW / 2, 424); ctx.textAlign = 'left';
  }
}
// ---------- shot staging (deterministic screenshots) ----------
function stageShot() {
  if (!SHOT) return;
  const p = g.player;
  if (SHOT === 'title') {
    g.screen = 'title'; g.cam.x = 480; g.cam.y = 880;
    return;
  }
  g.screen = 'play'; startMission(g, 0);
  if (SHOT === 'chase') {
    const car = g.markedCar;
    car.x = 700; car.y = 1310 + 29; car.angle = 0; car.speed = 265; car.stolen = true; car.marked = false;
    p.car = car; p.x = car.x; p.y = car.y; g.autoDrive = true;
    g.wanted = 3; g.heat = 9999;
    startMission(g, 1); g.phone = null;
    for (const [ox, oy] of [[-115, -4], [-200, 26]]) {
      const cop = makeCar(car.x + ox, car.y + oy, 0, '#e8e8ec', 'police');
      cop.speed = 250; g.cops.push(cop); g.cars.push(cop);
    }
    g.cam.x = Math.max(0, car.x - 500); g.cam.y = Math.max(0, car.y - 400);
  } else if (SHOT === 'drive') {
    const car = g.markedCar;
    car.x = 820; car.y = 1310 + 29; car.angle = 0; car.speed = 215; car.stolen = true; car.marked = false;
    p.car = car; p.x = car.x; p.y = car.y; g.autoDrive = true; g.phone = null;
    g.cam.x = Math.max(0, car.x - 560); g.cam.y = Math.max(0, car.y - 430);
  } else if (SHOT === 'mission') {
    g.mission.phase = 'deliver'; g.phone = null;
    const car = g.markedCar;
    car.x = GARAGE.x - 120; car.y = GARAGE.y + 66; car.angle = 0.4;
    p.x = GARAGE.x - 46; p.y = GARAGE.y + 42; p.car = null;
    g.cam.x = Math.max(0, GARAGE.x - 620); g.cam.y = Math.max(0, GARAGE.y - 400);
  }
}
// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.033, (now - last) / 1000); last = now;
  if (pressed.has('KeyM')) toggleMute();
  if (g.screen === 'title') {
    if (pressed.has('Enter') || mouse.clicked) startPlay(!!loadSave() && !pressed.has('KeyN'));
    if (pressed.has('KeyN')) { localStorage.removeItem(SAVE_KEY); g = makeGame(); g.screen = 'title'; startPlay(false); }
  } else if (g.screen === 'busted' || g.screen === 'wasted') {
    if (pressed.has('Enter') || mouse.clicked) g.screen = 'play';
  } else if (pressed.has('KeyP') || pressed.has('Escape')) {
    g.screen = g.screen === 'pause' ? 'play' : 'pause';
    blip();
  }
  if (g.screen === 'play') update(dt);
  else { g.time += dt; setSiren(false, g.time); }
  drawWorld();
  if (g.screen === 'play' || g.screen === 'pause') drawHUD(ctx, g, VW, VH);
  drawScreens();
  endFrame();
}
stageShot();
requestAnimationFrame(frame);
