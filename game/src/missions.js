// missions.js — Mara Voss's loop: steal the gold car, deliver it to the
// garage, run to the beach checkpoint, then lose the heat. A glowing beacon
// pillar marks the current target; each leg pays cash.
import { cashSound } from './audio.js';

export function createMissions(scene, city) {
  const beacon = new THREE.Group();
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 70, 18, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false }));
  pillar.position.y = 35; beacon.add(pillar);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.4, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd94d }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.6; beacon.add(ring);
  const light = new THREE.PointLight(0xffd94d, 0.9, 60);
  light.position.y = 8; beacon.add(light);
  scene.add(beacon);

  const M = {
    stage: 0, spotIdx: 0, goldCar: null, pulse: 0,
    banner() {
      switch (M.stage) {
        case 0: return 'MARA VOSS — Steal the GOLD CAR';
        case 1: return 'MARA VOSS — Deliver it to the GARAGE';
        case 2: return 'MARA VOSS — Reach the BEACH checkpoint';
        case 3: return 'MARA VOSS — LOSE THE HEAT!';
        default: return '';
      }
    },
    target() {
      switch (M.stage) {
        case 0: return M.goldCar ? M.goldCar.pos : city.goldSpots[M.spotIdx];
        case 1: return city.garagePos;
        case 2: return city.beachPos;
        default: return null;
      }
    },
    start(G) {
      M.goldCar = G.vehicles.spawnGold(city.goldSpots[M.spotIdx]);
    },
    pay(G, n, msg) {
      G.addCash(n);
      cashSound();
      G.toast(msg + '  +$' + n);
    },
    update(dt, G) {
      M.pulse += dt * 3;
      const t = M.target();
      if (t) {
        beacon.visible = true;
        beacon.position.set(t.x, 0, t.z);
        pillar.material.opacity = 0.2 + Math.sin(M.pulse) * 0.08;
        ring.scale.setScalar(1 + Math.sin(M.pulse) * 0.08);
      } else beacon.visible = false;
      const P = G.player;
      if (M.stage === 0 && M.goldCar && P.inCar === M.goldCar) {
        M.stage = 1;
        G.toast('Nice wheels. The garage, now.');
      } else if (M.stage === 1 && M.goldCar && P.inCar === M.goldCar) {
        if (P.inCar.pos.distanceTo(city.garagePos) < 17) {
          M.pay(G, 500, 'DELIVERED!');
          M.stage = 2;
        }
      } else if (M.stage === 2) {
        const pp = P.inCar ? P.inCar.pos : P.pos;
        if (pp.distanceTo(city.beachPos) < 13) {
          M.pay(G, 300, 'CHECKPOINT!');
          M.stage = 3;
          if (G.police.wanted < 3) G.police.setWanted(3, G);
          G.toast('Cops are coming — shake them!');
        }
      } else if (M.stage === 3) {
        if (G.police.wanted === 0) {
          M.pay(G, 400, 'CLEAN GETAWAY!');
          M.stage = 0;
          M.spotIdx = (M.spotIdx + 1) % city.goldSpots.length;
          M.goldCar = G.vehicles.spawnGold(city.goldSpots[M.spotIdx]);
        }
      }
    },
  };
  return M;
}
