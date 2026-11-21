// HUD: cash, health, wanted stars, mission banner, phone messages, speed,
// the busted meter, and the minimap with player / police / mission blips.
import { WORLD_W, WORLD_H, VX, HY, BEACH_Y } from './config.js';
import { missionBanner, missionTarget } from './missions.js';

function star(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd23f' : 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
}
export function drawMinimap(ctx, g, x, y, w, h) {
  const sx = w / WORLD_W, sy = h / WORLD_H;
  ctx.fillStyle = 'rgba(16,18,28,0.82)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
  ctx.fillStyle = '#2b7f9e'; ctx.fillRect(x, y + BEACH_Y * sy + (1650 - BEACH_Y) * sy * 0, w, 0); // placeholder no-op
  ctx.fillStyle = '#166a8c'; ctx.fillRect(x, y + 1650 * sy, w, h - 1650 * sy);
  ctx.fillStyle = '#ecd28f'; ctx.fillRect(x, y + BEACH_Y * sy, w, (1650 - BEACH_Y) * sy);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
  for (const cx of VX) { ctx.beginPath(); ctx.moveTo(x + cx * sx, y); ctx.lineTo(x + cx * sx, y + h); ctx.stroke(); }
  for (const cy of HY) { ctx.beginPath(); ctx.moveTo(x, y + cy * sy); ctx.lineTo(x + w, y + cy * sy); ctx.stroke(); }
  const tgt = missionTarget(g);
  if (tgt) {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(x + tgt.x * sx, y + tgt.y * sy, 4.5 + Math.sin(g.time * 5) * 1.2, 0, Math.PI * 2); ctx.fill();
  }
  for (const c of g.cops) {
    if (c.dead) continue;
    ctx.fillStyle = Math.sin(g.time * 10) > 0 ? '#ff3b30' : '#3b82f6';
    ctx.beginPath(); ctx.arc(x + c.x * sx, y + c.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  const p = g.player;
  ctx.save(); ctx.translate(x + p.x * sx, y + p.y * sy); ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
export function drawHUD(ctx, g, vw, vh) {
  ctx.textAlign = 'left';
  // Cash + health, top-left.
  ctx.fillStyle = 'rgba(10,10,18,0.55)'; ctx.beginPath(); ctx.roundRect(14, 12, 208, 58, 8); ctx.fill();
  ctx.fillStyle = '#7ee787'; ctx.font = 'bold 22px system-ui';
  ctx.fillText('$' + g.cash.toLocaleString('en-US'), 26, 38);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(26, 48, 180, 10);
  ctx.fillStyle = g.health > 30 ? '#4ade80' : '#f87171'; ctx.fillRect(26, 48, 180 * Math.max(0, g.health) / 100, 10);
  // Wanted stars, top-right.
  for (let i = 0; i < 5; i++) star(ctx, vw - 34 - i * 34, 32, 13, i < g.wanted);
  if (g.wanted > 0 && !g.playerSeen) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '13px system-ui'; ctx.textAlign = 'right';
    ctx.fillText('laying low…', vw - 20, 62); ctx.textAlign = 'left';
  }
  drawMinimap(ctx, g, vw - 196, 74, 182, 136);
  // Mission banner, top-centre.
  const banner = missionBanner(g);
  ctx.font = 'bold 16px system-ui';
  const bw = ctx.measureText(banner).width + 30;
  ctx.fillStyle = 'rgba(10,10,18,0.6)'; ctx.beginPath(); ctx.roundRect((vw - bw) / 2, 12, bw, 32, 8); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'center'; ctx.fillText(banner, vw / 2, 34); ctx.textAlign = 'left';
  // Phone message.
  if (g.phone && g.time < g.phone.until) {
    const w = 330, x = 14, y = vh - 108;
    ctx.fillStyle = 'rgba(12,14,22,0.88)'; ctx.beginPath(); ctx.roundRect(x, y, w, 86, 12); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 12px system-ui'; ctx.fillText('📱 ' + g.phone.from, x + 14, y + 22);
    ctx.fillStyle = '#f3f4f6'; ctx.font = '14px system-ui';
    wrapText(ctx, g.phone.text, x + 14, y + 44, w - 28, 18);
  }
  // Speed + controls hint.
  if (g.player.car) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(Math.abs(g.player.car.speed) * 0.36) + ' km/h', vw - 20, vh - 20);
    ctx.font = '12px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('E exit · WASD drive', vw - 20, vh - 44); ctx.textAlign = 'left';
  } else if (g.screen === 'play') {
    ctx.font = '12px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('WASD move · Shift sprint · E enter car · Click punch/shoot · H/M/P in menus', 16, vh - 14);
  }
  // Busted meter.
  if (g.busted > 0.02) {
    ctx.fillStyle = 'rgba(10,10,18,0.65)'; ctx.beginPath(); ctx.roundRect(vw / 2 - 130, vh / 2 - 90, 260, 44, 8); ctx.fill();
    ctx.fillStyle = '#f87171'; ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('BUSTED?', vw / 2, vh / 2 - 64);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(vw / 2 - 110, vh / 2 - 58, 220, 8);
    ctx.fillStyle = '#f87171'; ctx.fillRect(vw / 2 - 110, vh / 2 - 58, 220 * g.busted, 8);
    ctx.textAlign = 'left';
  }
  if (g.cityOwned) {
    ctx.fillStyle = 'rgba(255,210,63,0.9)'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('★ SOLMARA IS YOURS ★', vw / 2, 66); ctx.textAlign = 'left';
  }
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW && line) { ctx.fillText(line, x, yy); line = ''; yy += lh; }
    line += w + ' ';
  }
  ctx.fillText(line, x, yy);
}
