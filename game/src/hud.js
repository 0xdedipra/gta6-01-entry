// hud.js — all DOM overlay for Isle of Ash: cash, health, armour, the rank
// ladder and RP bar, the in-game clock, district label + toast, wanted
// stars, the act-framed mission box, the weapon slot panel, speed, busted
// bar, crosshair, toast, the canvas MINIMAP, the designed title screen over
// the island, and the pause screen with its LARGE island map, the story
// so far and the crew roster.
import { VX, HZ, BEACH_Z } from './city.js';
import { WEAPONS, WEAPON_ORDER } from './weapons.js';
import { districtAt, rankFor, ACTS, CREW, INTRO_LINES } from './story.js';

const CSS = `
#hud { position:fixed; inset:0; pointer-events:none; z-index:5; color:#fff; font-family:"Trebuchet MS", Verdana, sans-serif; }
.pill { background:rgba(10,14,22,0.72); border-radius:10px; padding:8px 14px; }
#cash { position:absolute; top:14px; left:16px; font-size:30px; font-weight:900; color:#7be495; text-shadow:0 2px 0 #000; }
#healthWrap { position:absolute; top:56px; left:16px; width:210px; height:14px; background:rgba(10,14,22,0.72); border-radius:7px; overflow:hidden; }
#healthBar { height:100%; width:100%; background:linear-gradient(90deg,#e23b3b,#ff8a5c); transition:width 0.15s; }
#armourWrap { position:absolute; top:74px; left:16px; width:210px; height:9px; background:rgba(10,14,22,0.72); border-radius:5px; overflow:hidden; }
#armourBar { height:100%; width:0%; background:linear-gradient(90deg,#3a6ea8,#9fd0ff); transition:width 0.15s; }
#rankText { position:absolute; top:88px; left:16px; font-size:12.5px; font-weight:900; letter-spacing:1.5px; color:#ffd94d; text-shadow:0 1px 0 #000; }
#rankWrap { position:absolute; top:106px; left:16px; width:210px; height:6px; background:rgba(10,14,22,0.72); border-radius:3px; overflow:hidden; }
#rankBar { height:100%; width:0%; background:#ffd94d; }
#clock { position:absolute; top:118px; left:16px; font-size:23px; font-weight:900; text-shadow:0 2px 0 #000; }
#district { position:absolute; top:146px; left:16px; font-size:12px; font-weight:800; letter-spacing:3px; color:#ffb347; text-shadow:0 1px 0 #000; }
#banner { position:absolute; top:14px; left:50%; transform:translateX(-50%); text-align:center; white-space:nowrap; }
#missionAct { font-size:11.5px; font-weight:900; letter-spacing:3px; color:#ffb347; }
#missionText { font-size:19px; font-weight:800; color:#ffd94d; letter-spacing:0.4px; }
#toast { position:absolute; top:66px; left:50%; transform:translateX(-50%); font-size:17px; font-weight:700; color:#fff; opacity:0; transition:opacity 0.3s; text-shadow:0 2px 0 #000; }
#districtToast { position:absolute; top:30%; left:50%; transform:translateX(-50%); text-align:center; opacity:0; transition:opacity 0.5s; text-shadow:0 3px 0 #000, 0 0 26px rgba(0,0,0,0.6); }
#districtToast .dname { font-size:46px; font-weight:900; letter-spacing:7px; color:#fff; }
#districtToast .dsub { font-size:15px; letter-spacing:5px; color:#ffd94d; font-weight:800; }
#stars { position:absolute; top:12px; right:16px; font-size:30px; letter-spacing:3px; color:#3a4152; text-shadow:0 2px 0 #000; }
#stars .on { color:#ffd94d; }
#minimapWrap { position:absolute; top:56px; right:16px; border:2px solid rgba(255,255,255,0.5); border-radius:8px; overflow:hidden; background:#20242c; }
#minimapCap { position:absolute; top:230px; right:16px; width:220px; text-align:center; font-size:11px; letter-spacing:3px; color:rgba(255,255,255,0.75); }
#slots { position:absolute; top:254px; right:16px; width:172px; display:flex; flex-direction:column; gap:4px; }
.slot { display:flex; justify-content:space-between; gap:6px; background:rgba(10,14,22,0.62); border:1px solid rgba(255,255,255,0.18); border-radius:7px; padding:4px 8px; font-size:12px; font-weight:800; letter-spacing:0.5px; color:#c8cfda; }
.slot .k { color:#8fa0b5; }
.slot.on { border-color:#ffd94d; color:#fff; background:rgba(40,32,8,0.78); }
.slot.lock { opacity:0.55; }
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
.screen { position:fixed; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(8,10,18,0.62); z-index:9; color:#fff; text-align:center; pointer-events:auto; font-family:"Trebuchet MS", Verdana, sans-serif; }
.screen h1 { font-size:64px; margin:0 0 4px; color:#ffd94d; text-shadow:0 4px 0 #b3541e, 0 8px 24px #000; letter-spacing:2px; }
.screen h2 { font-size:40px; margin:0 0 8px; color:#ff5964; text-shadow:0 3px 0 #000; }
.screen p { max-width:560px; font-size:16.5px; line-height:1.55; color:#e8ecf4; margin:6px 0; }
.screen .btn { margin-top:18px; background:#ffd94d; color:#221a08; border:none; font-size:20px; font-weight:900; padding:13px 34px; border-radius:10px; cursor:pointer; letter-spacing:1px; }
.screen .btn:hover { background:#ffe27a; }
.screen .keys { font-size:13.5px; color:#aeb8c8; line-height:1.7; }
#scr-title { background:linear-gradient(180deg, rgba(26,10,44,0.80) 0%, rgba(94,26,54,0.52) 52%, rgba(255,122,40,0.30) 100%); }
#scr-title h1 { font-size:96px; letter-spacing:4px; margin:0; line-height:0.95; }
#scr-title .subtitle { font-size:27px; font-weight:900; letter-spacing:14px; color:#ffb347; text-shadow:0 2px 0 #000; margin:2px 0 10px; }
#scr-title .story { font-size:16px; color:#f4e9dc; text-shadow:0 1px 0 #000; }
#scr-title .acts { margin:10px 0 4px; font-size:15.5px; line-height:1.65; color:#e8ecf4; text-shadow:0 1px 0 #000; }
#scr-title .acts b { color:#ffd94d; letter-spacing:1px; }
#scr-title .feature { margin-top:10px; font-size:13px; font-weight:900; letter-spacing:3px; color:#7be495; text-shadow:0 1px 0 #000; }
#scr-pause { background:rgba(6,8,14,0.90); justify-content:flex-start; padding-top:26px; overflow:auto; }
#scr-pause h2 { color:#ffd94d; font-size:30px; margin:0 0 12px; letter-spacing:3px; }
.pauseLayout { display:flex; gap:24px; align-items:flex-start; text-align:left; }
#bigmap { border:2px solid rgba(255,255,255,0.45); border-radius:10px; background:#1d6f92; }
.sidePanels { width:308px; color:#e8ecf4; }
.sidePanels h3 { margin:12px 0 5px; font-size:13px; letter-spacing:3px; color:#ffb347; }
.sidePanels h3:first-child { margin-top:0; }
.sidePanels p, .sidePanels .row { font-size:13.5px; line-height:1.55; margin:2px 0; max-width:308px; }
.sidePanels .st { float:right; font-weight:900; }
.sidePanels .ok { color:#7be495; }
.sidePanels .no { color:#8fa0b5; }
.sidePanels .keys { font-size:12.5px; line-height:1.65; }
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
    <div id="armourWrap"><div id="armourBar"></div></div>
    <div id="rankText">RANK 1 · DECKHAND</div>
    <div id="rankWrap"><div id="rankBar"></div></div>
    <div id="clock">07:12</div>
    <div id="district">PELABUHAN</div>
    <div id="banner" class="pill"><div id="missionAct">NEXT MISSION · ACT I — THE FERRY</div><div id="missionText"></div></div>
    <div id="toast"></div>
    <div id="districtToast"><div class="dname"></div><div class="dsub"></div></div>
    <div id="stars"></div>
    <div id="minimapWrap"><canvas id="minimap" width="220" height="168"></canvas></div>
    <div id="minimapCap">S O L M A R A</div>
    <div id="slots"></div>
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
  const actsHtml = ACTS.map((a) => `<div><b>ACT ${a.n} — ${a.name}</b> · ${a.blurb}</div>`).join('');
  makeScreen('scr-title', `
    <h1>SOLMARA HEAT</h1>
    <div class="subtitle">ISLE OF ASH</div>
    <p class="story">${INTRO_LINES.join(' ')}</p>
    <div class="acts">${actsHtml}</div>
    <button class="btn" id="btn-start">NEW GAME</button>
    <div class="feature">3 ACTS · 5 DISTRICTS · 5 WEAPONS — FREE ROAM · WANTED · CREW</div>
    <p class="keys">WASD move · SHIFT sprint · E enter/exit car · mouse aim &amp; shoot · 1–5 / wheel weapons · R reload<br>
    Right-mouse with the RIFLE zooms · P / Esc pause &amp; map · M mute · H horn · Enter starts</p>`);
  const crewHtml = CREW.map((c) => `<div class="row">${c.name} — ${c.role}<span class="st ${c.status === 'Recruited' ? 'ok' : 'no'}">${c.status.toUpperCase()}</span></div>`).join('');
  makeScreen('scr-pause', `
    <h2>ISLE OF ASH — PAUSED</h2>
    <div class="pauseLayout">
      <canvas id="bigmap" width="520" height="400"></canvas>
      <div class="sidePanels">
        <h3>STORY</h3>
        <p>${INTRO_LINES.join(' ')}</p>
        ${actsHtml}
        <p id="pauseRank"></p>
        <h3>CREW</h3>
        ${crewHtml}
        <h3>CONTROLS</h3>
        <p class="keys">WASD / arrows — move &amp; drive<br>SHIFT — sprint · E — enter/exit car<br>
        Mouse — aim · click — shoot · right-mouse — rifle zoom<br>1–5 / wheel / Q — weapons · R — reload<br>
        H — horn · M — mute · P / Esc — resume</p>
        <button class="btn" id="btn-resume">BACK TO THE STREETS</button>
      </div>
    </div>`);
  makeScreen('scr-busted', `<h2>BUSTED</h2><p id="bustedText">The police walk you to the station.</p><button class="btn" id="btn-busted">PAY &amp; WALK FREE</button>`);
  makeScreen('scr-wasted', `<h2>WASTED</h2><p>The clinic patches you up and sends the bill.</p><button class="btn" id="btn-wasted">LEAVE CLINIC (−$200)</button>`);

  const mm = el('minimap').getContext('2d');
  const bigmap = document.querySelector('#bigmap');
  const bmx = bigmap.getContext('2d');
  let toastTimer = 0, districtToastT = 0, lastDistrict = null, slotsSig = '';
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
      districtToastT -= dt;
      if (districtToastT <= 0) el('districtToast').style.opacity = 0;
      el('cash').textContent = '$' + G.cash;
      el('healthBar').style.width = Math.max(0, G.player.health) + '%';
      el('armourBar').style.width = Math.max(0, Math.min(100, (G.player.armour || 0) * 2)) + '%';
      // rank + RP
      const rk = rankFor(G.rp || 0);
      el('rankText').textContent = `RANK ${rk.idx} · ${rk.name} — ${G.rp || 0} RP`;
      el('rankBar').style.width = (rk.frac * 100) + '%';
      // in-game clock: the island day starts at 07:12
      const mins = (432 + Math.floor(G.time * 1.5)) % 1440;
      el('clock').textContent = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
      // district label + toast on entering somewhere new
      const pp = G.player.inCar ? G.player.inCar.pos : G.player.pos;
      const dist = districtAt(pp.x, pp.z);
      el('district').textContent = dist.name;
      if (dist.name !== lastDistrict) {
        if (lastDistrict !== null && G.state === 'playing') {
          el('districtToast').querySelector('.dname').textContent = dist.name;
          el('districtToast').querySelector('.dsub').textContent = dist.sub.toUpperCase();
          el('districtToast').style.opacity = 1;
          districtToastT = 2.4;
        }
        lastDistrict = dist.name;
      }
      // mission box, framed by act
      el('missionAct').textContent = 'NEXT MISSION · ' + G.missions.actLabel();
      el('missionText').textContent = G.missions.banner();
      let stars = '';
      for (let i = 0; i < 5; i++) stars += `<span class="${i < G.police.wanted ? 'on' : ''}">★</span>`;
      el('stars').innerHTML = stars;
      const W = G.weapons, def = WEAPONS[W.current], st = W.state[W.current];
      el('weaponName').textContent = def.name + (W.reloadT > 0 ? ' — RELOADING…' : '');
      el('weaponAmmo').innerHTML = def.mag === Infinity ? '∞' :
        `${st.mag} <small>/ ${st.reserve === Infinity ? '∞' : st.reserve}</small>`;
      el('weapon').style.display = G.player.inCar ? 'none' : 'block';
      // weapon slot panel: every slot, its ammo, or a lock
      let sig = W.current, slotsHtml = '';
      WEAPON_ORDER.forEach((k, i) => {
        const d = WEAPONS[k], s = W.state[k];
        const ammo = !s.unlocked ? '🔒' : d.mag === Infinity ? '∞' : `${s.mag}/${s.reserve === Infinity ? '∞' : s.reserve}`;
        sig += '|' + k + ammo + (W.current === k ? '*' : '');
        slotsHtml += `<div class="slot ${W.current === k ? 'on' : ''} ${s.unlocked ? '' : 'lock'}"><span><span class="k">${i + 1}</span> ${d.name}</span><span>${ammo}</span></div>`;
      });
      if (sig !== slotsSig) { slotsSig = sig; el('slots').innerHTML = slotsHtml; }
      el('cross').style.display = (!G.player.inCar && G.state === 'playing' && W.current !== 'fists') ? 'block' : 'none';
      el('speed').textContent = G.player.inCar ? Math.round(Math.abs(G.player.inCar.speed) * 2.4) + ' km/h' : '';
      const bm = G.police.bustedMeter;
      el('bustedWrap').style.display = bm > 0.02 ? 'block' : 'none';
      el('bustedBar').style.width = (bm * 100) + '%';
      drawMinimap(G);
      if (screens['scr-pause'].style.display !== 'none') {
        document.querySelector('#pauseRank').textContent =
          `Cash $${G.cash} · Rank ${rk.idx} ${rk.name} · ${G.rp || 0} RP · ${dist.name}`;
        drawBigMap(G);
      }
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

  // The pause screen's LARGE island map: sea, island, roads, the volcano,
  // district names, the mission target and Raka himself.
  function drawBigMap(G) {
    const W = 520, Hh = 400;
    const sx = (x) => (x + 700) / 1400 * W;
    const sz = (z) => (z + 860) / 1720 * Hh;
    bmx.fillStyle = '#1d6f92'; bmx.fillRect(0, 0, W, Hh);
    bmx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = 0; i < 40; i++) bmx.fillRect((i * 137) % W, (i * 89) % Hh, 14, 2);
    // island landmass + beach rim
    bmx.fillStyle = '#e6d492';
    bmx.beginPath(); bmx.roundRect(sx(-672), sz(-528), sx(672) - sx(-672), sz(716) - sz(-528), 26); bmx.fill();
    bmx.fillStyle = '#cfc39a';
    bmx.beginPath(); bmx.roundRect(sx(-648), sz(-504), sx(648) - sx(-648), sz(690) - sz(-504), 20); bmx.fill();
    // ash fields wash over the far north
    bmx.fillStyle = 'rgba(70,60,50,0.45)';
    bmx.fillRect(sx(-648), sz(-504), sx(648) - sx(-648), sz(-349) - sz(-504));
    // park
    bmx.fillStyle = '#62b95e'; bmx.fillRect(sx(-81), sz(-291), sx(81) - sx(-81), sz(-129) - sz(-291));
    // roads
    bmx.strokeStyle = '#4a5058'; bmx.lineWidth = 4;
    for (const rx of VX) { bmx.beginPath(); bmx.moveTo(sx(rx), sz(-492)); bmx.lineTo(sx(rx), sz(470)); bmx.stroke(); }
    for (const rz of HZ) { bmx.beginPath(); bmx.moveTo(sx(-640), sz(rz)); bmx.lineTo(sx(640), sz(rz)); bmx.stroke(); }
    // volcano: dark triangle + glowing crater, off the north shore
    bmx.fillStyle = '#4a4038';
    bmx.beginPath();
    bmx.moveTo(sx(-190), sz(-640)); bmx.lineTo(sx(-60), sz(-800)); bmx.lineTo(sx(70), sz(-640)); bmx.closePath(); bmx.fill();
    bmx.fillStyle = '#ff6a22';
    bmx.beginPath(); bmx.arc(sx(-60), sz(-772), 6, 0, 6.29); bmx.fill();
    // district labels
    bmx.font = '900 12px Trebuchet MS, sans-serif';
    bmx.textAlign = 'center';
    const label = (x, z, s) => {
      bmx.fillStyle = 'rgba(255,255,255,0.75)'; bmx.fillText(s, sx(x) + 1, sz(z) + 1);
      bmx.fillStyle = '#33302a'; bmx.fillText(s, sx(x), sz(z));
    };
    label(-60, -420, 'LADANG ABU');
    label(-60, -215, 'BUKIT KALA');
    label(-300, 40, 'PASAR SENJA');
    label(300, 40, 'KOTA TUA');
    label(100, 590, 'PELABUHAN');
    label(-60, -668, 'KALA');
    // mission target + police
    const t = G.missions.target();
    if (t) {
      bmx.fillStyle = '#ffd94d';
      bmx.beginPath(); bmx.arc(sx(t.x), sz(t.z), 6 + Math.sin(G.time * 5) * 1.5, 0, 6.29); bmx.fill();
      bmx.strokeStyle = '#fff'; bmx.lineWidth = 1.5; bmx.stroke();
    }
    bmx.fillStyle = '#ff4040';
    for (const c of G.police.cars) if (c.active) { bmx.beginPath(); bmx.arc(sx(c.car.pos.x), sz(c.car.pos.z), 3.5, 0, 6.29); bmx.fill(); }
    // Raka
    const px = sx(G.player.pos.x), pz = sz(G.player.pos.z);
    bmx.fillStyle = '#fff';
    bmx.beginPath(); bmx.arc(px, pz, 5, 0, 6.29); bmx.fill();
    bmx.strokeStyle = '#ffd94d'; bmx.lineWidth = 2.5;
    bmx.beginPath(); bmx.arc(px, pz, 8.5, 0, 6.29); bmx.stroke();
    bmx.font = '900 10px Trebuchet MS, sans-serif';
    bmx.fillStyle = '#fff'; bmx.fillText('RAKA', px, pz - 13);
  }
  return H;
}
