// player.js — blocky characters: a shared builder makes the player and every
// pedestrian (box head with a canvas face, torso, swinging arms and legs).
// The Player walks camera-relative with AABB collision; Peds wander the
// sidewalks, flee danger, and tip over when shot.
import { collideCircle, onRoad } from './city.js';
import { axis, down } from './input.js';

function faceTexture(skin, mood) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const g = cv.getContext('2d');
  g.fillStyle = skin; g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#20242c';
  g.fillRect(8, 13, 4, 5); g.fillRect(20, 13, 4, 5); // eyes
  if (mood === 'scared') { g.fillRect(13, 23, 6, 5); }
  else { g.fillRect(11, 24, 10, 2); }
  const t = new THREE.CanvasTexture(cv);
  return t;
}

export function buildCharacter({ shirt = 0x2ec4b6, pants = 0x33526e, skin = '#e8b48c', hair = 0x2b2118 } = {}) {
  const grp = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const skinMat = new THREE.MeshLambertMaterial({ map: faceTexture(skin, 'calm') });
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5),
    [mat(0xe8b48c), mat(0xe8b48c), mat(hair), mat(0xe8b48c), skinMat, mat(0xe8b48c)]);
  head.position.y = 5.05;
  grp.add(head);
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.6), mat(hair));
  hairTop.position.y = 5.85; grp.add(hairTop);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.3, 1.1), mat(shirt));
  torso.position.y = 3.55; grp.add(torso);
  function limb(w, h, d, color, x, y) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.y = -h / 2;
    pivot.add(m);
    grp.add(pivot);
    return pivot;
  }
  const armL = limb(0.62, 2.5, 0.62, shirt, -1.4, 4.6);
  const armR = limb(0.62, 2.5, 0.62, shirt, 1.4, 4.6);
  const legL = limb(0.78, 2.4, 0.78, pants, -0.55, 2.4);
  const legR = limb(0.78, 2.4, 0.78, pants, 0.55, 2.4);
  // right-hand anchor: weapons attach their gun model here
  const handR = new THREE.Object3D();
  handR.position.set(0, -2.5, 0.2);
  armR.add(handR);
  return {
    group: grp, armL, armR, legL, legR, handR, head,
    setWalk(phase, amt) {
      armL.rotation.x = Math.sin(phase) * 0.75 * amt;
      armR.rotation.x = -Math.sin(phase) * 0.75 * amt;
      legL.rotation.x = -Math.sin(phase) * 0.8 * amt;
      legR.rotation.x = Math.sin(phase) * 0.8 * amt;
    },
    aimPose() { // right arm points forward when a gun is out
      armR.rotation.x = -Math.PI / 2 + 0.12;
    },
  };
}

export function createPlayer(scene) {
  // Raka, the deckhand: he spawns on the Pelabuhan dock where the ferry
  // dropped him, at the south end of the island.
  const c = buildCharacter({ shirt: 0xff5964, pants: 0x2e4057, skin: '#c68863' });
  c.group.position.set(100, 0, 452);
  scene.add(c.group);
  const p = {
    char: c, group: c.group, health: 100, armour: 0, angle: Math.PI, walkPhase: 0,
    speedNow: 0, lastHurt: -99, inCar: null,
    get pos() { return c.group.position; },
    hurt(n, t) {
      // armour soaks damage first, plate by plate
      const soaked = Math.min(p.armour, n);
      p.armour -= soaked;
      p.health = Math.max(0, p.health - (n - soaked));
      p.lastHurt = t;
    },
    update(dt, G) {
      if (p.inCar || G.state !== 'playing') { c.setWalk(0, 0); return; }
      const a = axis();
      const moving = a.x !== 0 || a.z !== 0;
      const sprint = down('ShiftLeft') || down('ShiftRight');
      const speed = sprint ? 30 : 19;
      p.speedNow = moving ? speed : 0;
      if (moving) {
        const len = Math.hypot(a.x, a.z);
        const sin = Math.sin(G.camYaw), cos = Math.cos(G.camYaw);
        const mx = (a.x * cos - a.z * sin) / len, mz = (a.x * -sin - a.z * cos) / len * -1;
        // camera-relative: forward on screen is -z rotated by camYaw
        const fx = -Math.sin(G.camYaw), fz = -Math.cos(G.camYaw);
        const rx = Math.cos(G.camYaw), rz = -Math.sin(G.camYaw);
        const dx = (fx * -a.z + rx * a.x) / len, dz = (fz * -a.z + rz * a.x) / len;
        void mx; void mz;
        p.pos.x += dx * speed * dt;
        p.pos.z += dz * speed * dt;
        collideCircle(p.pos, 1.15, G.city.colliders);
        p.angle = Math.atan2(dx, dz);
        p.walkPhase += dt * (sprint ? 13 : 10);
      }
      c.group.rotation.y = p.angle;
      const aiming = G.weapons && G.weapons.current !== 'fists' && (G.mouseDown || G.rightDown || G.forceAim);
      c.setWalk(p.walkPhase, moving ? 1 : 0);
      if (aiming) c.aimPose();
      // slow regen once out of trouble for a while
      if (G.time - p.lastHurt > 9 && p.health > 0) p.health = Math.min(100, p.health + dt * 2.2);
    },
  };
  return p;
}

// --- pedestrians -----------------------------------------------------------
const PED_COLORS = [0xffe74c, 0x3ddad7, 0xff9f1c, 0x9b5de5, 0x00bbf9, 0xf15bb5, 0x8ac926, 0xffca3a];
export function createPeds(scene, rng) {
  const list = [];
  function wanderTarget() {
    for (let i = 0; i < 24; i++) {
      const x = -600 + rng() * 1200, z = -460 + rng() * 900;
      if (!onRoad(x, z)) return { x, z };
    }
    return { x: 0, z: 300 };
  }
  for (let i = 0; i < 26; i++) {
    const c = buildCharacter({
      shirt: PED_COLORS[i % PED_COLORS.length], pants: 0x444a55,
      skin: ['#e8b48c', '#c68863', '#8a5a3b', '#f2cfae'][i % 4],
    });
    const t = wanderTarget();
    c.group.position.set(t.x, 0, t.z);
    scene.add(c.group);
    const ped = {
      char: c, group: c.group, down: false, downT: 0, target: wanderTarget(),
      angle: rng() * 6.28, phase: rng() * 6.28, speed: 6 + rng() * 3,
      get pos() { return c.group.position; },
    };
    c.group.userData.pedRef = ped;
    list.push(ped);
  }
  return {
    list,
    update(dt, G) {
      for (const ped of list) {
        if (ped.down) {
          ped.downT += dt;
          ped.group.rotation.x = Math.max(-Math.PI / 2, ped.group.rotation.x - dt * 7);
          ped.group.position.y = 0.55;
          continue;
        }
        let tx = ped.target.x, tz = ped.target.z, sp = ped.speed;
        const dangerAge = G.time - G.danger.t;
        if (dangerAge < 2.5) {
          const d = Math.hypot(ped.pos.x - G.danger.x, ped.pos.z - G.danger.z);
          if (d < 46) { // flee directly away from the trouble
            tx = ped.pos.x + (ped.pos.x - G.danger.x) / (d + 0.1) * 60;
            tz = ped.pos.z + (ped.pos.z - G.danger.z) / (d + 0.1) * 60;
            sp = 21;
          }
        }
        const dx = tx - ped.pos.x, dz = tz - ped.pos.z, dist = Math.hypot(dx, dz);
        if (dist < 3) { ped.target = wanderTarget(); continue; }
        ped.pos.x += (dx / dist) * sp * dt;
        ped.pos.z += (dz / dist) * sp * dt;
        collideCircle(ped.pos, 1.0, G.city.colliders);
        ped.angle = Math.atan2(dx, dz);
        ped.group.rotation.y = ped.angle;
        ped.phase += dt * 9;
        ped.char.setWalk(ped.phase, 1);
      }
    },
    knockDown(ped) { if (!ped.down) { ped.down = true; ped.downT = 0; } },
  };
}
