// hud.js — all DOM overlay: cash, health, wanted stars, mission banner,
// weapon panel, speed, busted bar, crosshair, toast, the full screens
// (title / pause / busted / wasted) and the canvas MINIMAP with roads,
// the player arrow, police dots, the mission target and weapon crates.
import { VX, HZ, BEACH_Z } from './city.js';
import { WEAPONS } from './weapons.js';

const CSS = `
#hud { position:fixed; inset:0; pointer-events:none; z-index:5; color:#fff; }
.pill { background:rgba(10,14,22,0.72); border-radius:10px; padding:8px 14px; }
#cash { position:absolute; top:14px; left:16px; font-size:30px; font-weight:900; color:#7be495; text-shadow:0 2px 0 #000; }
#healthWrap { position:absolute; top:56px; left:16px; width:210px; height:14px; background:rgba(10,14,22,0.72); border-radius:7px; overflow:hidden; }
#healthBar { height:100%; width:100%; background:linear-gradient(90deg,#e23b3b,#ff8a5c); transition:width 0.15s; }
#banner { position:absolute; top:14px; left:50%; transform:translateX(-50%); font-size:19px; font-weight:800; color:#ffd94d; letter-spacing:0.4px; white-space:nowrap; }
#toast { position:absolute; top:58px; left:50%; transform:translateX(-50%); font-size:17px; font-weight:700; color:#fff; opacity:0; transition:opacity 0.3s; text-shadow:0 2px 0 #000; }
#stars { position:absolute; top:12px; right:16px; font-size:30px; letter-spacing:3px; color:#3a4152; text-shadow:0 2px 0 #000; }
#stars .on { color:#ffd94d; }
#minimapWrap { position:absolute; top:56px; right:16px; border:2px solid rgba(255,255,255,0.5); border-radius:8px; overflow:hidden; background:#20242c; }
#minimapCap { position:absolute; top:230px; right:16px; width:220px; text-align:center; font-size:11px; letter-spacing:3px; color:rgba(255,255,255,0.75); }
#weapon { position:absolute; right:16px; bottom:16px; text-align:right; }
#weaponName { font-size:21px; font-weight:900; letter-spacing:1px; text-shadow:0 2px 0 #000; }
#weaponAmmo { font-size:32px; font-weight:900; text-shadow:0 2px 0 #000; }
#weaponAmmo small { font-size:17px; color:#c8cfda; }
#weaponHint { font-size:12px; color:#c8cfda; }
#speed { position:absolute; bottom:16px; left:50%; transform:translateX(-50%); font-size:26px; font-weight:900; text-shadow:0 2px 0 #000; }
#hint { position:absolute; left:16px; bottom:16px; font-size:12.5px; color:rgba(255,255,255,0.85); text-shadow:0 1px 0 #000; line-height:1.5; }
#cross { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); font-size:22px; color:rgba(255,255,255,0.9); text-shadow:0 0 4px #000; }
#bustedWrap { position:absolute; left:50%; bottom:120px; transform:translateX(-50%); width:300px; text-align:center; font-weight:900; color:#ff5964; letter-spacing:2px; }
#bustedBarBg { height:12px; background:rgba(10,14,22,0.75); border-radius:6px; overflow:hidden; margin-top:4px; }
#bustedBar { height:100%; width:0%; background:#ff5964; }
.screen { position:fixed; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(8,10,18,0.62); z-index:9; color:#fff; text-align:center; pointer-events:auto; }
.screen h1 { font-size:64px; margin:0 0 4px; color:#ffd94d; text-shadow:0 4px 0 #b3541e, 0 8px 24px #000; letter-spacing:2px; }
.screen h2 { font-size:40px; margin:0 0 8px; color:#ff5964; text-shadow:0 3px 0 #000; }
.screen p { max-width:560px; font-size:16.5px; line-height:1.55; color:#e8ecf4; margin:6px 0; }
.screen .btn { margin-top:18px; background:#ffd94d; color:#221a08; border:none; font-size:20px; font-weight:900; padding:13px 34px; border-radius:10px; cursor:pointer; letter-spacing:1px; }
.screen .btn:hover { background:#ffe27a; }
.screen .keys { font-size:13.5px; color:#aeb8c8; line-height:1.7; }
`;

export function createHud() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div id="cash">$0</div>
    <div id="healthWrap"><div id="healthBar"></div></div>
    <div id="banner" class="pill"></div>
    <div id="toast"></div>
    <div id="stars"></div>
    <div id="minimapWrap"><canvas id="minimap" width="220" height="168"></canvas></div>
    <div id="minimapCap">S O L M A R A</div>
    <div id="weapon"><div id="weaponName"></div><div id="weaponAmmo"></div><div id="weaponHint">1-5 / wheel switch · R reload</div></div>
    <div id="speed"></div>
    <div id="hint">WASD move · E car · SHIFT sprint · mouse shoot<br>P pause · M mute · H horn</div>
    <div id="cross">+</div>
    <div id="bustedWrap" style="display:none">BUSTED?<div id="bustedBarBg"><div id="bustedBar"></div></div></div>`;
  document.body.appendChild(root);
  const el = (id) => root.querySelector('#' + id);
  const screens = {};
  function makeScreen(id, html) {
    const s = document.createElement('div');
    s.className = 'screen'; s.id = id; s.innerHTML = html; s.style.display = 'none';
    document.body.appendChild(s);
    screens[id] = s;
    return s;
  }
  makeScreen('scr-title', `
    <h1>SOLMARA HEAT 3D</h1>
    <p><b>ARSENAL EDITION.</b> Fixer Mara Voss has work: steal the gold car, run her
    checkpoints, and lose the heat in the sun-soaked streets of Solmara. Five weapons,
    one city, zero patience from the police.</p>
    <button class="btn" id="btn-start">START ENGINE</button>
    <p class="keys">WASD move · SHIFT sprint · E enter/exit car · mouse aim &amp; shoot · 1–5 / wheel weapons · R reload<br>
    Right-mouse with the RIFLE zooms · P pause · M mute · H horn</p>`);
  makeScreen('scr-pause', `<h2>PAUSED</h2><p>Solmara waits for no one. Well — just this once.</p><button class="btn" id="btn-resume">BACK TO THE STREETS</button>`);
  makeScreen('scr-busted', `<h2>BUSTED</h2><p id="bustedText">The police walk you to the station.</p><button class="btn" id="btn-busted">PAY &amp; WALK FREE</button>`);
  makeScreen('scr-wasted', `<h2>WASTED</h2><p>The clinic patches you up and sends the bill.</p><button class="btn" id="btn-wasted">LEAVE CLINIC (−$200)</button>`);

  const mm = el('minimap').getContext('2d');
  let toastTimer = 0;
  const H = {
    root, screens,
    onStart: null, onResume: null, onBusted: null, onWasted: null,
    show(name) {
      for (const k of Object.keys(screens)) screens[k].style.display = k === name ? 'flex' : 'none';
    },
    hideScreens() { H.show(null); },
    toast(msg) { el('toast').textContent = msg; el('toast').style.opacity = 1; toastTimer = 2.6; },
    update(dt, G) {
      toastTimer -= dt;
      if (toastTimer <= 0) el('toast').style.opacity = 0;
      el('cash').textContent = '$' + G.cash;
      el('healthBar').style.width = Math.max(0, G.player.health) + '%';
      el('banner').textContent = G.missions.banner();
      let stars = '';
      for (let i = 0; i < 5; i++) stars += `<span class="${i < G.police.wanted ? 'on' : ''}">★</span>`;
      el('stars').innerHTML = stars;
      const W = G.weapons, def = WEAPONS[W.current], st = W.state[W.current];
      el('weaponName').textContent = def.name + (W.reloadT > 0 ? ' — RELOADING…' : '');
      el('weaponAmmo').innerHTML = def.mag === Infinity ? '∞' :
        `${st.mag} <small>/ ${st.reserve === Infinity ? '∞' : st.reserve}</small>`;
      el('weapon').style.display = G.player.inCar ? 'none' : 'block';
      el('cross').style.display = (!G.player.inCar && G.state === 'playing' && W.current !== 'fists') ? 'block' : 'none';
      el('speed').textContent = G.player.inCar ? Math.round(Math.abs(G.player.inCar.speed) * 2.4) + ' km/h' : '';
      const bm = G.police.bustedMeter;
      el('bustedWrap').style.display = bm > 0.02 ? 'block' : 'none';
      el('bustedBar').style.width = (bm * 100) + '%';
      drawMinimap(G);
    },
  };
  document.querySelector('#btn-start').addEventListener('click', () => H.onStart && H.onStart());
  document.querySelector('#btn-resume').addEventListener('click', () => H.onResume && H.onResume());
  document.querySelector('#btn-busted').addEventListener('click', () => H.onBusted && H.onBusted());
  document.querySelector('#btn-wasted').addEventListener('click', () => H.onWasted && H.onWasted());

  function drawMinimap(G) {
    const W = 220, Hh = 168;
    const sx = (x) => (x + 660) / 1320 * W;
    const sz = (z) => (z + 520) / 1240 * Hh;
    mm.fillStyle = '#262b33'; mm.fillRect(0, 0, W, Hh);
    mm.fillStyle = '#f2dfa0'; mm.fillRect(0, sz(BEACH_Z), W, sz(566) - sz(BEACH_Z));
    mm.fillStyle = '#2e9fc4'; mm.fillRect(0, sz(566), W, Hh - sz(566));
    mm.strokeStyle = '#4a5058'; mm.lineWidth = 3;
    for (const rx of VX) { mm.beginPath(); mm.moveTo(sx(rx), sz(-500)); mm.lineTo(sx(rx), sz(BEACH_Z)); mm.stroke(); }
    for (const rz of HZ) { mm.beginPath(); mm.moveTo(sx(-640), sz(rz)); mm.lineTo(sx(640), sz(rz)); mm.stroke(); }
    // weapon crates
    mm.fillStyle = '#ff9f1c';
    for (const pk of G.weapons.pickups) if (pk.kind === 'crate' && pk.active) mm.fillRect(sx(pk.mesh.position.x) - 2, sz(pk.mesh.position.z) - 2, 4, 4);
    // mission target
    const t = G.missions.target();
    if (t) {
      mm.fillStyle = '#ffd94d';
      mm.beginPath(); mm.arc(sx(t.x), sz(t.z), 4 + Math.sin(G.time * 5) * 1.2, 0, 6.29); mm.fill();
    }
    // police
    mm.fillStyle = '#ff4040';
    for (const c of G.police.cars) if (c.active) { mm.beginPath(); mm.arc(sx(c.car.pos.x), sz(c.car.pos.z), 3, 0, 6.29); mm.fill(); }
    // player arrow
    const px = sx(G.player.pos.x), pz = sz(G.player.pos.z);
    const ang = G.player.inCar ? G.player.inCar.angle : G.player.angle;
    mm.save();
    mm.translate(px, pz);
    mm.rotate(Math.PI - ang);
    mm.fillStyle = '#ffffff';
    mm.beginPath(); mm.moveTo(0, -6); mm.lineTo(4, 5); mm.lineTo(-4, 5); mm.closePath(); mm.fill();
    mm.restore();
  }
  return H;
}
