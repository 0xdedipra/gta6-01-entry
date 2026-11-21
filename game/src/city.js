// city.js — Solmara, built procedurally: a 6x4 road grid, ~35 blocks of
// pastel buildings with lit-window canvas textures, a park, a gas station, a
// garage, a clinic, and a beach with animated sea and palms along the south.
// Exports the AABB collider list and a circle-vs-AABB resolver every mover uses.
export const VX = [-500, -300, -100, 100, 300, 500]; // vertical roads (run along z)
export const HZ = [-330, -110, 110, 330];           // horizontal roads (run along x)
export const ROAD_W = 38;
export const BOUND_X = 632, BOUND_ZN = -492, BOUND_ZS = 648;
export const BEACH_Z = 470, SEA_Z = 566;

// Small seeded RNG so the city is the same on every load (and per ?seed=).
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function collideCircle(pos, r, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.x0, Math.min(pos.x, c.x1));
    const nz = Math.max(c.z0, Math.min(pos.z, c.z1));
    let dx = pos.x - nx, dz = pos.z - nz;
    let d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 < 0.0001) { // centre inside the box: push out the nearest face
        const pl = pos.x - c.x0, pr = c.x1 - pos.x, pt = pos.z - c.z0, pb = c.z1 - pos.z;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) pos.x = c.x0 - r; else if (m === pr) pos.x = c.x1 + r;
        else if (m === pt) pos.z = c.z0 - r; else pos.z = c.z1 + r;
      } else {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * r; pos.z = nz + (dz / d) * r;
      }
    }
  }
  pos.x = Math.max(-BOUND_X, Math.min(BOUND_X, pos.x));
  pos.z = Math.max(BOUND_ZN, Math.min(BOUND_ZS, pos.z));
  return pos;
}

export function onRoad(x, z) {
  for (const rx of VX) if (Math.abs(x - rx) < ROAD_W / 2 + 4) return true;
  for (const rz of HZ) if (Math.abs(z - rz) < ROAD_W / 2 + 4) return true;
  return false;
}

function windowTexture(rng, base, lit) {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 120; y += 12) for (let x = 6; x < 56; x += 12) {
    g.fillStyle = rng() < lit ? '#ffd97a' : 'rgba(20,26,40,0.85)';
    g.fillRect(x, y, 7, 8);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function signTexture(text, bg, fg) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48;
  const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 48);
  g.fillStyle = fg; g.font = 'bold 30px Trebuchet MS, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 26);
  return new THREE.CanvasTexture(cv);
}

const PASTELS = ['#e8b4b8', '#f2d5a0', '#a8d5ba', '#a0c4e8', '#d5a8e0', '#f0e0b6', '#b8d0e8', '#e8c39e'];

export function buildCity(scene, seed = 7) {
  const rng = makeRng(seed * 7919 + 13);
  const colliders = [];
  const city = {
    colliders, update: null,
    garagePos: new THREE.Vector3(569, 0, -356),
    clinicPos: new THREE.Vector3(-560, 0, 284),
    beachPos: new THREE.Vector3(100, 0, 520),
    goldSpots: [
      new THREE.Vector3(-100, 0, 236), new THREE.Vector3(300, 0, -206),
      new THREE.Vector3(-300, 0, 24), new THREE.Vector3(500, 0, 196),
    ],
    crateSpots: [
      new THREE.Vector3(-478, 0, -352), new THREE.Vector3(505, 0, 352),
      new THREE.Vector3(0, 0, -210), new THREE.Vector3(-478, 0, 466),
      new THREE.Vector3(360, 0, 520), new THREE.Vector3(-206, 0, -110),
    ],
  };

  scene.background = new THREE.Color(0x9fd4e8);
  scene.fog = new THREE.Fog(0x9fd4e8, 420, 1150);
  scene.add(new THREE.HemisphereLight(0xcfeeff, 0x8a7a5a, 0.95));
  const sun = new THREE.DirectionalLight(0xfff2cc, 0.85);
  sun.position.set(240, 380, 160);
  scene.add(sun);

  // --- ground: one canvas texture draws asphalt + lane dashes for the grid
  const gc = document.createElement('canvas'); gc.width = gc.height = 1024;
  const gg = gc.getContext('2d');
  gg.fillStyle = '#43484f'; gg.fillRect(0, 0, 1024, 1024);
  // the plane is centred at z=80 and rotated flat, so world z maps to canvas
  // y through (z + 620) while world x maps straight through (x + 700)
  const W2Cx = (v) => (v + 700) / 1400 * 1024;
  const W2Cz = (v) => (v + 620) / 1400 * 1024;
  gg.fillStyle = '#ddd8c8';
  for (const rx of VX) for (let z = -660; z < 460; z += 46) gg.fillRect(W2Cx(rx) - 1.5, W2Cz(z), 3, 17);
  for (const rz of HZ) for (let x = -680; x < 680; x += 46) gg.fillRect(W2Cx(x), W2Cz(rz) - 1.5, 17, 3);
  const gtex = new THREE.CanvasTexture(gc);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshLambertMaterial({ map: gtex }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 80);
  scene.add(ground);

  // --- beach + sea
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(1400, 190),
    new THREE.MeshLambertMaterial({ color: 0xf2dfa0 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.06, BEACH_Z + 95);
  scene.add(sand);
  const sc = document.createElement('canvas'); sc.width = 128; sc.height = 32;
  const sg = sc.getContext('2d');
  sg.fillStyle = '#2e9fc4'; sg.fillRect(0, 0, 128, 32);
  sg.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 22; i++) sg.fillRect(rng() * 128, rng() * 32, 12, 2);
  const stex = new THREE.CanvasTexture(sc);
  stex.wrapS = stex.wrapT = THREE.RepeatWrapping; stex.repeat.set(10, 2);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 220),
    new THREE.MeshLambertMaterial({ map: stex }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.04, SEA_Z + 100);
  scene.add(sea);

  // --- blocks
  const xCols = [[-619, -519], [-481, -319], [-281, -119], [-81, 81], [119, 281], [319, 481], [519, 619]];
  const zRows = [[-460, -349], [-291, -129], [-91, 91], [129, 291], [349, 460]];
  const SPECIALS = { '3,1': 'park', '1,2': 'gas', '6,0': 'garage', '0,3': 'clinic' };
  const slabMat = new THREE.MeshLambertMaterial({ color: 0xb9bdc2 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x6b6f76 });
  const texPool = PASTELS.map((c) => windowTexture(rng, c, 0.4));

  function addBuilding(cx, cz, w, d, h, tex) {
    const side = new THREE.MeshLambertMaterial({ map: tex });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roofMat, roofMat, side, side]);
    m.position.set(cx, h / 2, cz);
    scene.add(m);
    colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
    return m;
  }
  function addSign(x, y, z, ry, text, bg, fg) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(26, 5),
      new THREE.MeshBasicMaterial({ map: signTexture(text, bg, fg) }));
    s.position.set(x, y, z); s.rotation.y = ry;
    scene.add(s);
  }
  function addTree(x, z, palm) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, palm ? 9 : 5, 6),
      new THREE.MeshLambertMaterial({ color: palm ? 0x9a7a52 : 0x7a5c38 }));
    trunk.position.y = (palm ? 9 : 5) / 2; trunk.rotation.z = palm ? 0.1 : 0;
    g.add(trunk);
    if (palm) {
      const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d, side: THREE.DoubleSide });
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.2), leafMat);
        leaf.position.y = 9.4; leaf.rotation.y = (i / 5) * Math.PI * 2; leaf.rotation.z = 0.7;
        leaf.translateX(3.4);
        g.add(leaf);
      }
    } else {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(4.4, 0),
        new THREE.MeshLambertMaterial({ color: 0x4da653 }));
      blob.position.y = 8; g.add(blob);
    }
    g.position.set(x, 0, z);
    scene.add(g);
    colliders.push({ x0: x - 0.9, x1: x + 0.9, z0: z - 0.9, z1: z + 0.9 });
  }

  for (let ci = 0; ci < xCols.length; ci++) for (let ri = 0; ri < zRows.length; ri++) {
    const [x0, x1] = xCols[ci], [z0, z1] = zRows[ri];
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 14, 0.5, d + 14), slabMat);
    slab.position.set(cx, 0.25, cz);
    scene.add(slab);
    const kind = SPECIALS[ci + ',' + ri] || (rng() < 0.16 ? 'parking' : 'buildings');
    if (kind === 'buildings') {
      const n = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const bw = (w - 26) / n;
        addBuilding(x0 + 13 + bw * (i + 0.5), cz + (rng() - 0.5) * 8,
          bw - 6, d - 30 - rng() * 22, 16 + rng() * 52, texPool[Math.floor(rng() * texPool.length)]);
      }
      if (rng() < 0.6) addTree(x0 + 10, z0 + 10, false);
    } else if (kind === 'park') {
      const lawn = new THREE.Mesh(new THREE.BoxGeometry(w - 8, 0.7, d - 8),
        new THREE.MeshLambertMaterial({ color: 0x62b95e }));
      lawn.position.set(cx, 0.35, cz); scene.add(lawn);
      for (let i = 0; i < 6; i++) addTree(x0 + 18 + rng() * (w - 36), z0 + 18 + rng() * (d - 36), i % 2 === 0);
    } else if (kind === 'parking') {
      const lot = new THREE.Mesh(new THREE.BoxGeometry(w - 10, 0.62, d - 10),
        new THREE.MeshLambertMaterial({ color: 0x555a61 }));
      lot.position.set(cx, 0.31, cz); scene.add(lot);
    } else if (kind === 'gas') {
      addBuilding(cx - w / 4, cz, w / 3, d - 44, 10, texPool[3]);
      addSign(cx - w / 4, 11.5, cz - (d - 44) / 2 - 0.3, Math.PI, 'GAS · 24H', '#20303c', '#ffd94d');
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(w / 2, 1.6, d / 2),
        new THREE.MeshLambertMaterial({ color: 0xe85454 }));
      canopy.position.set(cx + w / 5, 11, cz); scene.add(canopy);
      const postMat = new THREE.MeshLambertMaterial({ color: 0xd8dce0 });
      for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 10.4, 8), postMat);
        p.position.set(cx + w / 5 + px * w / 4.6, 5.2, cz + pz * d / 4.6); scene.add(p);
      }
      const pumpMat = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
      for (let i = -1; i <= 1; i++) {
        const pump = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3, 1.2), pumpMat);
        pump.position.set(cx + w / 5 + i * 9, 1.5, cz); scene.add(pump);
        colliders.push({ x0: pump.position.x - 0.8, x1: pump.position.x + 0.8, z0: cz - 0.6, z1: cz + 0.6 });
      }
    } else if (kind === 'garage' || kind === 'clinic') {
      const isGarage = kind === 'garage';
      addBuilding(cx, cz, w - 34, d - 40, 13, isGarage ? texPool[6] : texPool[2]);
      addSign(cx, 14.5, cz - (d - 40) / 2 - 0.3, Math.PI,
        isGarage ? 'GARAGE' : 'CLINIC +', isGarage ? '#20303c' : '#f4f6f8', isGarage ? '#ffd94d' : '#e23b3b');
      const pad = new THREE.Mesh(new THREE.BoxGeometry(30, 0.66, 22),
        new THREE.MeshLambertMaterial({ color: isGarage ? 0xffd94d : 0xf4f6f8 }));
      pad.position.set(cx, 0.33, z1 - 14); scene.add(pad);
    }
  }

  // palms along the beach and the southern boulevard
  for (let x = -600; x <= 620; x += 55) { addTree(x + rng() * 14, 486 + rng() * 26, true); if (rng() < 0.7) addTree(x + 26, 350 + 8, true); }

  let t = 0;
  city.update = (dt) => { t += dt; stex.offset.x = Math.sin(t * 0.24) * 0.03; stex.offset.y = (t * 0.015) % 1; };
  return city;
}
