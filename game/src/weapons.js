// weapons.js — the arsenal: fists, pistol, SMG, shotgun and rifle, each with
// its own box-built gun model in the player's hand, hitscan tracers, muzzle
// flash, magazines and reserves, plus the crates/ammo/health pickups that
// unlock and feed them.
import { hit } from './input.js';
import { shotSound, dryFire, reloadSound, pickupSound } from './audio.js';

export const WEAPON_ORDER = ['fists', 'pistol', 'smg', 'shotgun', 'rifle'];
export const WEAPONS = {
  fists:   { name: 'FISTS',   dmg: 40, rate: 0.34, mag: Infinity, reserve: Infinity, auto: false, spread: 0,    pellets: 1, range: 8,   reload: 0 },
  pistol:  { name: 'PISTOL',  dmg: 34, rate: 0.27, mag: 12, reserve: 48,  auto: false, spread: 0.006, pellets: 1, range: 260, reload: 0.9 },
  smg:     { name: 'SMG',     dmg: 15, rate: 0.085, mag: 30, reserve: 90, auto: true,  spread: 0.034, pellets: 1, range: 240, reload: 1.1 },
  shotgun: { name: 'SHOTGUN', dmg: 13, rate: 0.95, mag: 6,  reserve: 24,  auto: false, spread: 0.085, pellets: 6, range: 120, reload: 1.5 },
  rifle:   { name: 'RIFLE',   dmg: 95, rate: 1.05, mag: 5,  reserve: 20,  auto: false, spread: 0.001, pellets: 1, range: 520, reload: 1.4 },
};

function gunModel(kind) {
  const g = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x23252c });
  const mid = new THREE.MeshLambertMaterial({ color: 0x4a4f58 });
  const box = (w, h, d, x, y, z, m = dark) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); g.add(b); return b;
  };
  let tipZ = 1.2;
  if (kind === 'pistol') { box(0.34, 0.5, 1.5, 0, 0, 0.4); box(0.3, 0.7, 0.4, 0, -0.5, -0.2, mid); tipZ = 1.2; }
  if (kind === 'smg') { box(0.36, 0.55, 2.6, 0, 0, 0.8); box(0.28, 1.0, 0.36, 0, -0.7, 0.5, mid); box(0.3, 0.3, 0.9, 0, 0.42, -0.5, mid); tipZ = 2.2; }
  if (kind === 'shotgun') { box(0.44, 0.6, 3.2, 0, 0, 1.0); box(0.4, 0.4, 1.1, 0, -0.35, 1.2, new THREE.MeshLambertMaterial({ color: 0x8a5a2e })); tipZ = 2.7; }
  if (kind === 'rifle') { box(0.34, 0.5, 4.2, 0, 0, 1.4); box(0.26, 0.5, 0.7, 0, 0.5, 0.4, mid); box(0.2, 0.9, 0.3, 0, -0.6, 0.9, mid); tipZ = 3.6; }
  const tip = new THREE.Object3D();
  tip.position.set(0, 0.05, tipZ);
  g.add(tip);
  g.userData.tip = tip;
  g.rotation.x = Math.PI / 2; // barrel from +z to match the aiming arm
  return g;
}

function flashTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,240,180,1)');
  grad.addColorStop(0.4, 'rgba(255,160,60,0.8)');
  grad.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

export function createWeapons(scene, player, city) {
  const state = {};
  for (const k of WEAPON_ORDER) state[k] = { mag: WEAPONS[k].mag, reserve: WEAPONS[k].reserve, unlocked: k === 'fists' || k === 'pistol' };
  const guns = {};
  for (const k of WEAPON_ORDER) {
    if (k === 'fists') continue;
    const m = gunModel(k);
    m.visible = false;
    player.char.handR.add(m);
    guns[k] = m;
  }
  const raycaster = new THREE.Raycaster();
  const flashTex = flashTexture();
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, opacity: 0, depthWrite: false }));
  flash.scale.set(2.6, 2.6, 1); scene.add(flash);
  const flashLight = new THREE.PointLight(0xffb050, 0, 60); scene.add(flashLight);
  const tracers = [];
  const tracerMat = () => new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9 });
  const impacts = [];
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, opacity: 0, depthWrite: false, color: 0xbbbbbb }));
    s.scale.set(1.6, 1.6, 1); scene.add(s);
    impacts.push({ s, life: 0 });
  }
  let impactIdx = 0;

  // --- pickups: weapon crates, ammo boxes, health packs
  const pickups = [];
  const crateFor = ['smg', 'shotgun', 'rifle', 'smg', 'shotgun', 'rifle'];
  city.crateSpots.forEach((spot, i) => {
    const kind = crateFor[i % crateFor.length];
    const grp = new THREE.Group();
    const crate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 3.4),
      new THREE.MeshLambertMaterial({ color: 0xe07b39 }));
    crate.position.y = 1.1; grp.add(crate);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.6, 3.5),
      new THREE.MeshBasicMaterial({ color: kind === 'smg' ? 0x3ddad7 : kind === 'shotgun' ? 0xff5964 : 0xffe74c }));
    stripe.position.y = 1.7; grp.add(stripe);
    grp.position.copy(spot); scene.add(grp);
    pickups.push({ kind: 'crate', weapon: kind, mesh: grp, active: true, respawnT: 0, baseY: 0 });
  });
  const ammoSpots = [new THREE.Vector3(120, 0, -110), new THREE.Vector3(-320, 0, 330), new THREE.Vector3(520, 0, -120), new THREE.Vector3(-140, 0, 520)];
  for (const spot of ammoSpots) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x3f9e4d }));
    m.position.set(spot.x, 0.7, spot.z); scene.add(m);
    pickups.push({ kind: 'ammo', mesh: m, active: true, respawnT: 0, baseY: 0.7 });
  }
  const healthSpots = [city.clinicPos.clone().add(new THREE.Vector3(14, 0, 4)), new THREE.Vector3(30, 0, -180), new THREE.Vector3(-520, 0, 520)];
  for (const spot of healthSpots) {
    const grp = new THREE.Group();
    const boxM = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4),
      new THREE.MeshLambertMaterial({ color: 0xf4f6f8 }));
    boxM.position.y = 1.2; grp.add(boxM);
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 2.5), new THREE.MeshBasicMaterial({ color: 0xe23b3b }));
    c1.position.y = 1.2; grp.add(c1);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.7, 2.5), new THREE.MeshBasicMaterial({ color: 0xe23b3b }));
    c2.position.y = 1.2; grp.add(c2);
    grp.position.copy(spot); scene.add(grp);
    pickups.push({ kind: 'health', mesh: grp, active: true, respawnT: 0, baseY: 0 });
  }
  // body armour, handed out at the clinic: a steel-blue vest on a stand
  {
    const grp = new THREE.Group();
    const vest = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.9, 1.5),
      new THREE.MeshLambertMaterial({ color: 0x3a6ea8 }));
    vest.position.y = 1.7; grp.add(vest);
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 1.6),
      new THREE.MeshBasicMaterial({ color: 0xffd94d }));
    band.position.y = 2.1; grp.add(band);
    grp.position.copy(city.clinicPos).add(new THREE.Vector3(-13, 0, 6));
    scene.add(grp);
    pickups.push({ kind: 'armour', mesh: grp, active: true, respawnT: 0, baseY: 0 });
  }

  const W = {
    state, current: 'pistol', cooldown: 0, reloadT: 0, pickups,
    get def() { return WEAPONS[W.current]; },
    select(k) {
      if (!state[k].unlocked || W.current === k) return;
      W.current = k; W.reloadT = 0;
      for (const key of Object.keys(guns)) guns[key].visible = key === k;
    },
    cycle(dir) {
      let i = WEAPON_ORDER.indexOf(W.current);
      for (let n = 0; n < WEAPON_ORDER.length; n++) {
        i = (i + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length;
        if (state[WEAPON_ORDER[i]].unlocked) { W.select(WEAPON_ORDER[i]); return; }
      }
    },
    startReload() {
      const st = state[W.current], def = W.def;
      if (W.reloadT > 0 || st.mag >= def.mag || st.reserve <= 0 || def.mag === Infinity) return;
      W.reloadT = def.reload; reloadSound();
    },
    fire(G) {
      const def = W.def, st = state[W.current];
      if (W.cooldown > 0 || W.reloadT > 0 || G.player.inCar) return;
      if (st.mag <= 0) { dryFire(); W.cooldown = 0.3; W.startReload(); return; }
      W.cooldown = def.rate;
      if (def.mag !== Infinity) st.mag--;
      shotSound(W.current);
      G.danger.x = G.player.pos.x; G.danger.z = G.player.pos.z; G.danger.t = G.time;
      const cam = G.camera;
      const origin = cam.position.clone();
      const muzzle = guns[W.current] ? guns[W.current].userData.tip.getWorldPosition(new THREE.Vector3()) : G.player.pos.clone().add(new THREE.Vector3(0, 4.4, 0));
      if (guns[W.current]) {
        flash.position.copy(muzzle);
        flash.material.opacity = 0.95; flash.scale.set(2 + Math.random(), 2 + Math.random(), 1);
        flashLight.position.copy(muzzle); flashLight.intensity = 2.4;
      }
      if (W.current !== 'fists') G.onCrime('shot', G.player.pos);
      for (let p = 0; p < def.pellets; p++) {
        const dir = new THREE.Vector3();
        cam.getWorldDirection(dir);
        dir.x += (Math.random() - 0.5) * 2 * def.spread;
        dir.y += (Math.random() - 0.5) * 2 * def.spread;
        dir.z += (Math.random() - 0.5) * 2 * def.spread;
        dir.normalize();
        shootRay(G, origin, dir, def, muzzle);
      }
      if (st.mag === 0) W.startReload();
    },
    update(dt, G) {
      W.cooldown = Math.max(0, W.cooldown - dt);
      flash.material.opacity = Math.max(0, flash.material.opacity - dt * 14);
      flashLight.intensity = Math.max(0, flashLight.intensity - dt * 22);
      for (let i = tracers.length - 1; i >= 0; i--) {
        const t = tracers[i];
        t.life -= dt;
        t.line.material.opacity = Math.max(0, t.life / 0.07) * 0.9;
        if (t.life <= 0) { G.scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); tracers.splice(i, 1); }
      }
      for (const im of impacts) {
        if (im.life > 0) { im.life -= dt; im.s.material.opacity = Math.max(0, im.life / 0.25) * 0.8; im.s.position.y += dt * 2; }
      }
      if (W.reloadT > 0) {
        W.reloadT -= dt;
        if (W.reloadT <= 0) {
          const st = state[W.current], def = W.def;
          const take = Math.min(def.mag - st.mag, st.reserve);
          st.mag += take; st.reserve -= take;
        }
      }
      // switching
      for (let i = 0; i < WEAPON_ORDER.length; i++) if (hit('Digit' + (i + 1))) W.select(WEAPON_ORDER[i]);
      if (hit('KeyQ')) W.cycle(1);
      if (G.wheelDelta) W.cycle(G.wheelDelta);
      if (hit('KeyR')) W.startReload();
      if (!G.player.inCar && G.state === 'playing') {
        if (W.def.auto ? G.mouseDown : G.mouseClicked) W.fire(G);
      }
      // pickups
      for (const pk of pickups) {
        if (!pk.active) {
          pk.respawnT -= dt;
          if (pk.respawnT <= 0 && pk.kind !== 'crate') { pk.active = true; pk.mesh.visible = true; }
          continue;
        }
        pk.mesh.rotation.y += dt * (pk.kind === 'crate' ? 0.7 : 1.4);
        const d = Math.hypot(pk.mesh.position.x - G.player.pos.x, pk.mesh.position.z - G.player.pos.z);
        if (d < 4.6 && !G.player.inCar) {
          if (pk.kind === 'crate') {
            const w = pk.weapon;
            if (!state[w].unlocked) {
              state[w].unlocked = true;
              state[w].reserve += WEAPONS[w].reserve;
              W.select(w);
              G.toast(WEAPONS[w].name + ' UNLOCKED!');
            } else {
              state[w].reserve += WEAPONS[w].mag * 3;
              G.toast(WEAPONS[w].name + ' AMMO +');
            }
            pickupSound();
            pk.active = false; pk.mesh.visible = false; pk.respawnT = 9999;
          } else if (pk.kind === 'ammo') {
            for (const k of ['pistol', 'smg', 'shotgun', 'rifle']) if (state[k].unlocked) state[k].reserve += WEAPONS[k].mag;
            G.toast('AMMO RESTOCKED'); pickupSound();
            pk.active = false; pk.mesh.visible = false; pk.respawnT = 45;
          } else if (pk.kind === 'health' && G.player.health < 100) {
            G.player.health = Math.min(100, G.player.health + 50);
            G.toast('+50 HEALTH'); pickupSound();
            pk.active = false; pk.mesh.visible = false; pk.respawnT = 50;
          } else if (pk.kind === 'armour' && G.player.armour < 50) {
            G.player.armour = 50;
            G.toast('ARMOUR UP — 50'); pickupSound();
            pk.active = false; pk.mesh.visible = false; pk.respawnT = 45;
          }
        }
      }
    },
  };
  guns.pistol.visible = true;

  function shootRay(G, origin, dir, def, muzzle) {
    raycaster.set(origin, dir);
    raycaster.far = def.range;
    let best = null;
    // meshes: peds and cars
    const meshes = [];
    for (const ped of G.peds.list) if (!ped.down) meshes.push(ped.group);
    for (const car of G.vehicles.cars) if (car.mesh.visible) meshes.push(car.mesh);
    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length) best = { point: hits[0].point, dist: hits[0].distance, obj: hits[0].object };
    // buildings: ray vs AABB slabs
    for (const c of G.city.colliders) {
      const t = rayAabb(origin, dir, c);
      if (t !== null && t < def.range && (!best || t < best.dist)) {
        best = { point: origin.clone().add(dir.clone().multiplyScalar(t)), dist: t, obj: null };
      }
    }
    // ground
    if (dir.y < -0.001) {
      const t = -origin.y / dir.y;
      if (t > 0 && t < def.range && (!best || t < best.dist)) {
        best = { point: origin.clone().add(dir.clone().multiplyScalar(t)), dist: t, obj: null };
      }
    }
    const end = best ? best.point : origin.clone().add(dir.clone().multiplyScalar(def.range));
    // tracer
    if (W.current !== 'fists') {
      const geo = new THREE.BufferGeometry().setFromPoints([muzzle, end]);
      const line = new THREE.Line(geo, tracerMat());
      G.scene.add(line);
      tracers.push({ line, life: 0.07 });
    }
    if (!best) return;
    // impact puff
    const im = impacts[impactIdx++ % impacts.length];
    im.s.position.copy(end); im.life = 0.25; im.s.material.opacity = 0.8;
    // resolve what was hit
    let node = best.obj;
    while (node) {
      if (node.userData.pedRef) {
        const ped = node.userData.pedRef;
        G.peds.knockDown(ped);
        G.onCrime('pedshot', ped.pos);
        return;
      }
      if (node.userData.carRef) {
        const car = node.userData.carRef;
        G.vehicles.damageCar(car, def.dmg);
        if (car.kind === 'police') G.onCrime('copcar', car.pos);
        else G.onCrime('carshot', car.pos);
        return;
      }
      node = node.parent;
    }
    // fists: a swing that hit nothing still whooshes — handled by range check in fire
  }

  function rayAabb(o, d, c) {
    let tmin = 0, tmax = Infinity;
    const axes = [
      [o.x, d.x, c.x0, c.x1], [o.y, d.y, 0, 60], [o.z, d.z, c.z0, c.z1],
    ];
    for (const [oo, dd, lo, hi] of axes) {
      if (Math.abs(dd) < 1e-8) { if (oo < lo || oo > hi) return null; }
      else {
        let t1 = (lo - oo) / dd, t2 = (hi - oo) / dd;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) return null;
      }
    }
    return tmin > 0.5 ? tmin : null;
  }

  // fists need a proximity check because the camera ray may pass over a ped:
  const baseFire = W.fire;
  W.fire = (G) => {
    if (W.current !== 'fists') { baseFire(G); return; }
    if (W.cooldown > 0 || G.player.inCar) return;
    W.cooldown = WEAPONS.fists.rate;
    shotSound('fists');
    const fwd = new THREE.Vector3(-Math.sin(G.camYaw), 0, -Math.cos(G.camYaw));
    for (const ped of G.peds.list) {
      if (ped.down) continue;
      const to = new THREE.Vector3(ped.pos.x - G.player.pos.x, 0, ped.pos.z - G.player.pos.z);
      if (to.length() < 7 && to.normalize().dot(fwd) > 0.4) {
        G.peds.knockDown(ped);
        G.onCrime('pedshot', ped.pos);
        G.danger.x = G.player.pos.x; G.danger.z = G.player.pos.z; G.danger.t = G.time;
        return;
      }
    }
  };
  return W;
}
