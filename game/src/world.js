// The city of Solmara: a procedural road grid with solid neon blocks, palms,
// a beach and an animated sea along the south edge. Owns generation, collision
// queries and all city drawing.
import { WORLD_W, WORLD_H, ROAD_HALF, VX, HY, BEACH_Y, SEA_Y, COLORS } from './config.js';
import { mulberry32, pick, range } from './random.js';

export function buildCity(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const blockCols = [[0, VX[0]], ...VX.slice(0, -1).map((x, i) => [x, VX[i + 1]]), [VX[VX.length - 1], WORLD_W]];
  const blockRows = [[0, HY[0]], ...HY.slice(0, -1).map((y, i) => [y, HY[i + 1]]), [HY[HY.length - 1], BEACH_Y]];
  const shades = ['#6b5b73', '#746280', '#5d5470', '#7a6a8a', '#655a7d', '#71617c'];
  for (const [x0, x1] of blockCols) {
    for (const [y0, y1] of blockRows) {
      const bx = x0 + ROAD_HALF + 16, by = y0 + ROAD_HALF + 16;
      const bw = (x1 - ROAD_HALF - 16) - bx, bh = (y1 - ROAD_HALF - 16) - by;
      if (bw < 90 || bh < 90) continue;
      // One or two buildings per block, with a neon strip and a window seed.
      const split = bw > 260 && rng() > 0.5;
      const mk = (x, y, w, h) => buildings.push({
        x, y, w, h, color: pick(rng, shades), neon: pick(rng, COLORS.neon),
        seed: Math.floor(rng() * 1e9), name: pick(rng, ['HOTEL', 'BAR', 'CLUB', 'GYM', 'DINER', 'PIER 9', 'CASINO', 'TACO', 'INK', 'MOTEL']),
      });
      if (split) { const w2 = bw / 2 - 8; mk(bx, by, w2, bh); mk(bx + w2 + 16, by, w2, bh); }
      else mk(bx, by, bw, bh);
    }
  }
  const palms = [];
  for (let x = 60; x < WORLD_W; x += 90 + rng() * 90) palms.push({ x, y: BEACH_Y + 26 + rng() * 60, s: range(rng, 0.8, 1.3) });
  for (const x of VX) for (let y = 90; y < BEACH_Y - 60; y += 210 + rng() * 120) {
    palms.push({ x: x + ROAD_HALF + 12, y, s: range(rng, 0.7, 1.05) });
    palms.push({ x: x - ROAD_HALF - 12, y: y + 60, s: range(rng, 0.7, 1.05) });
  }
  const cones = [];
  for (let i = 0; i < 26; i++) cones.push({ x: range(rng, 60, WORLD_W - 60), y: pick(rng, HY) + range(rng, -40, 40), hit: false });
  return { buildings, palms, cones };
}

export function onRoad(x, y) {
  if (y >= BEACH_Y) return false;
  for (const cx of VX) if (Math.abs(x - cx) <= ROAD_HALF) return true;
  for (const cy of HY) if (Math.abs(y - cy) <= ROAD_HALF) return true;
  return false;
}
export function pointSolid(city, x, y, forCar = false) {
  if (x < 8 || y < 8 || x > WORLD_W - 8 || y > WORLD_H - 8) return true;
  if (forCar && y > SEA_Y - 6) return true;
  for (const b of city.buildings) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  return false;
}
export function circleHitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(x, b.x + b.w)), ny = Math.max(b.y, Math.min(y, b.y + b.h));
    if ((nx - x) ** 2 + (ny - y) ** 2 < r * r) return b;
  }
  return null;
}
export function nearestRoadPoint(x, y) {
  let best = { x, y }, bd = 1e18;
  for (const cx of VX) { const d = Math.abs(x - cx); if (d < bd) { bd = d; best = { x: cx, y }; } }
  for (const cy of HY) { const d = Math.abs(y - cy); if (d < bd) { bd = d; best = { x, y: cy }; } }
  return best;
}

function drawBuilding(ctx, b) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
  ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(b.x, b.y, b.w, 7);
  ctx.fillStyle = b.neon; ctx.fillRect(b.x, b.y + b.h - 10, b.w, 5);
  const rng = mulberry32(b.seed);
  ctx.fillStyle = 'rgba(255,214,120,0.85)';
  for (let wy = b.y + 16; wy < b.y + b.h - 22; wy += 21) {
    for (let wx = b.x + 11; wx < b.x + b.w - 14; wx += 19) {
      if (rng() > 0.45) ctx.fillRect(wx, wy, 9, 12);
    }
  }
  ctx.fillStyle = b.neon;
  ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(b.name, b.x + b.w / 2, b.y + 15);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
}
function drawPalm(ctx, p, t) {
  const sway = Math.sin(t * 1.3 + p.x * 0.05) * 2;
  ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 5 * p.s;
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + 4 * p.s, p.y - 16 * p.s, p.x + 8 * p.s + sway, p.y - 26 * p.s); ctx.stroke();
  ctx.strokeStyle = '#2e8b57'; ctx.lineWidth = 3 * p.s;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + sway * 0.05;
    ctx.beginPath(); ctx.moveTo(p.x + 8 * p.s + sway, p.y - 26 * p.s);
    ctx.quadraticCurveTo(p.x + 8 * p.s + Math.cos(a) * 14 * p.s, p.y - 26 * p.s + Math.sin(a) * 6 * p.s - 4,
      p.x + 8 * p.s + Math.cos(a) * 20 * p.s, p.y - 26 * p.s + Math.sin(a) * 10 * p.s + 4); ctx.stroke();
  }
}
export function drawCity(ctx, city, cam, vw, vh, t) {
  const x0 = cam.x, y0 = cam.y, x1 = cam.x + vw, y1 = cam.y + vh;
  ctx.fillStyle = COLORS.block; ctx.fillRect(0, 0, vw, vh);
  // Sand and sea (south edge).
  if (y1 > BEACH_Y) {
    ctx.fillStyle = COLORS.sand; ctx.fillRect(0, Math.max(0, BEACH_Y - y0), vw, vh);
    const sy = Math.max(0, SEA_Y - y0);
    ctx.fillStyle = COLORS.sea; ctx.fillRect(0, sy, vw, vh - sy);
    ctx.fillStyle = COLORS.seaDeep;
    for (let wy = SEA_Y + 18; wy < Math.min(y1, WORLD_H); wy += 34) {
      for (let wx = ((wy * 7) % 120) - 60; wx < x1; wx += 120) {
        const sx = wx - x0 + Math.sin(t * 1.6 + wy + wx * 0.02) * 7;
        if (sx > -70 && sx < vw + 10) ctx.fillRect(sx, wy - y0, 52, 5);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(0, SEA_Y - y0 - 3, vw, 4);
  }
  // Roads.
  ctx.fillStyle = COLORS.asphalt;
  for (const cx of VX) ctx.fillRect(cx - ROAD_HALF - x0, 0, ROAD_HALF * 2, Math.min(vh, BEACH_Y + 60 - y0));
  for (const cy of HY) ctx.fillRect(0, cy - ROAD_HALF - y0, vw, ROAD_HALF * 2);
  // Sidewalk edges.
  ctx.fillStyle = COLORS.sidewalk;
  for (const cx of VX) { ctx.fillRect(cx - ROAD_HALF - 7 - x0, 0, 7, Math.min(vh, BEACH_Y + 60 - y0)); ctx.fillRect(cx + ROAD_HALF - x0, 0, 7, Math.min(vh, BEACH_Y + 60 - y0)); }
  for (const cy of HY) { ctx.fillRect(0, cy - ROAD_HALF - 7 - y0, vw, 7); ctx.fillRect(0, cy + ROAD_HALF - y0, vw, 7); }
  // Lane dashes.
  ctx.fillStyle = COLORS.lane;
  for (const cx of VX) for (let y = 12; y < BEACH_Y; y += 44) if (y - y0 > -30 && y - y0 < vh) ctx.fillRect(cx - 2 - x0, y - y0, 4, 24);
  for (const cy of HY) for (let x = 12; x < WORLD_W; x += 44) if (x - x0 > -30 && x - x0 < vw) ctx.fillRect(x - x0, cy - 2 - y0, 24, 4);
  // Buildings in view.
  for (const b of city.buildings) {
    if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
    ctx.save(); ctx.translate(-x0, -y0); drawBuilding(ctx, b); ctx.restore();
  }
  // Palms and cones.
  for (const p of city.palms) {
    if (p.x < x0 - 40 || p.x > x1 + 40 || p.y < y0 - 40 || p.y > y1 + 40) continue;
    ctx.save(); ctx.translate(-x0, -y0); drawPalm(ctx, p, t); ctx.restore();
  }
  for (const c of city.cones) {
    if (c.hit || c.x < x0 - 20 || c.x > x1 + 20 || c.y < y0 - 20 || c.y > y1 + 20) continue;
    ctx.fillStyle = '#ff7f2a';
    ctx.beginPath(); ctx.moveTo(c.x - x0, c.y - 8 - y0); ctx.lineTo(c.x + 6 - x0, c.y + 5 - y0); ctx.lineTo(c.x - 6 - x0, c.y + 5 - y0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(c.x - 3 - x0, c.y - 2 - y0, 6, 3);
  }
}
