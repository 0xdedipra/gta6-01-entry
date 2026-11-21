// vehicles.js — every car in Solmara: one box-built mesh factory (body, cabin,
// spinning wheels, optional police light bar), parked cars, grid-following
// traffic, the player's arcade driving physics, and damage with smoke/fire.
import { VX, HZ, ROAD_W, collideCircle } from './city.js';
import { down } from './input.js';
import { crashSound } from './audio.js';

const CAR_COLORS = [0xe63946, 0x457b9d, 0x2a9d8f, 0xe9c46a, 0xf4a261, 0x9b5de5, 0xffffff, 0x22223b, 0x43aa8b];

export function createCarMesh(color, { police = false } = {}) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.7, 9), mat(color));
  body.position.y = 1.45; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.5, 4.6),
    mat(police ? 0x1c1e26 : 0x22303e));
  cabin.position.set(0, 2.95, -0.3); g.add(cabin);
  const wheels = [];
  const wgeo = new THREE.CylinderGeometry(1.05, 1.05, 0.7, 10);
  const wmat = mat(0x17181c);
  for (const [x, z] of [[-2.1, 2.9], [2.1, 2.9], [-2.1, -2.9], [2.1, -2.9]]) {
    const w = new THREE.Mesh(wgeo, wmat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 1.05, z);
    g.add(w); wheels.push(w);
  }
  let lightBar = null, lightRed = null, lightBlue = null;
  if (police) {
    lightBar = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 1.4), mat(0x11131a));
    base.position.y = 0.5; lightBar.add(base);
    lightRed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.2),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    lightRed.position.set(-0.85, 0.55, 0); lightBar.add(lightRed);
    lightBlue = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.2),
      new THREE.MeshBasicMaterial({ color: 0x2255ff }));
    lightBlue.position.set(0.85, 0.55, 0); lightBar.add(lightBlue);
    lightBar.position.y = 3.7;
    g.add(lightBar);
  }
  g.userData.wheels = wheels;
  g.userData.lightRed = lightRed; g.userData.lightBlue = lightBlue;
  return g;
}

function smokeTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

export function createVehicles(scene, city, rng) {
  const cars = [];
  const smokeTex = smokeTexture();
  const puffs = [];
  for (let i = 0; i < 110; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false }));
    s.scale.set(3, 3, 1); s.visible = false;
    scene.add(s);
    puffs.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, dark: false });
  }
  let puffIdx = 0;
  function puff(x, y, z, dark, big) {
    const p = puffs[puffIdx++ % puffs.length];
    p.s.position.set(x, y, z);
    p.s.material.color.set(dark ? 0x2a2a2e : 0xcccccc);
    p.life = p.max = 1.3 + Math.random() * 0.6;
    p.vx = (Math.random() - 0.5) * 1.6; p.vy = 6 + Math.random() * 3; p.vz = (Math.random() - 0.5) * 1.6;
    p.s.scale.set(big ? 7.5 : 4, big ? 7.5 : 4, 1);
    p.s.visible = true;
  }

  function addCar(kind, color, x, z, angle, opts = {}) {
    const mesh = createCarMesh(color, opts);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = angle;
    scene.add(mesh);
    const car = {
      mesh, kind, color, angle, speed: 0, health: 100, burning: false, dead: false,
      smokeT: 0, axis: null, dir: 1, lane: 0, isGold: !!opts.gold, stolen: false,
      get pos() { return mesh.position; },
    };
    mesh.userData.carRef = car;
    cars.push(car);
    return car;
  }

  // parked cars along the vertical roads, noses to the kerb
  const parkZ = [-420, -240, -40, 180, 260, 420];
  for (const rx of VX) for (const pz of parkZ) {
    if (rng() < 0.42) continue;
    const side = rng() < 0.5 ? -1 : 1;
    addCar('parked', CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)],
      rx + side * (ROAD_W / 2 + 3.4), pz + (rng() - 0.5) * 22, side > 0 ? Math.PI : 0);
  }
  // traffic
  for (let i = 0; i < 11; i++) {
    const vertical = rng() < 0.55;
    const car = addCar('traffic', CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)], 0, 0, 0);
    if (vertical) {
      const rx = VX[Math.floor(rng() * VX.length)];
      car.axis = 'z'; car.dir = rng() < 0.5 ? 1 : -1; car.lane = car.dir * 7;
      car.mesh.position.set(rx + car.lane, 0, -460 + rng() * 900);
      car.angle = car.dir > 0 ? 0 : Math.PI;
    } else {
      const rz = HZ[Math.floor(rng() * HZ.length)];
      car.axis = 'x'; car.dir = rng() < 0.5 ? 1 : -1; car.lane = -car.dir * 7;
      car.mesh.position.set(-600 + rng() * 1200, 0, rz + car.lane);
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    car.speed = 15 + rng() * 7;
    car.mesh.rotation.y = car.angle;
  }

  const V = {
    cars, goldCar: null,
    addCar,
    spawnGold(spot) {
      if (V.goldCar) { // recycle: repaint an existing parked car instead
        V.goldCar.isGold = false;
      }
      const car = addCar('parked', 0xffc400, spot.x, spot.z, Math.PI / 2, { gold: true });
      car.isGold = true;
      V.goldCar = car;
      return car;
    },
    damageCar(car, n) {
      if (car.dead) return;
      car.health -= n;
      if (car.health <= 35 && !car.burning) { /* starts smoking in update */ }
      if (car.health <= 0) { car.health = 0; car.burning = true; car.dead = true; car.speed = 0; }
    },
    nearestCar(pos, maxDist, drivableOnly = true) {
      let best = null, bd = maxDist;
      for (const c of cars) {
        if (c.dead || c.kind === 'police') continue;
        if (drivableOnly && c.kind === 'traffic' && Math.abs(c.speed) > 2) continue;
        const d = Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    },
    // arcade driving for the player's current car
    drive(car, dt, G) {
      const accel = down('KeyW') || down('ArrowUp'), brake = down('KeyS') || down('ArrowDown');
      const left = down('KeyA') || down('ArrowLeft'), right = down('KeyD') || down('ArrowRight');
      if (accel) car.speed += 30 * dt;
      if (brake) car.speed -= (car.speed > 1 ? 55 : 16) * dt;
      car.speed -= car.speed * 0.55 * dt; // drag
      car.speed = Math.max(-20, Math.min(64, car.speed));
      if (Math.abs(car.speed) > 0.4) {
        const steer = (left ? 1 : 0) - (right ? 1 : 0);
        car.angle += steer * dt * 1.55 * Math.min(1, Math.abs(car.speed) / 26) * Math.sign(car.speed);
      }
      const ox = car.pos.x, oz = car.pos.z;
      car.pos.x += Math.sin(car.angle) * car.speed * dt;
      car.pos.z += Math.cos(car.angle) * car.speed * dt;
      const before = Math.hypot(car.pos.x - ox, car.pos.z - oz);
      collideCircle(car.pos, 3.6, G.city.colliders);
      const after = Math.hypot(car.pos.x - ox, car.pos.z - oz);
      if (before - after > 0.55 && Math.abs(car.speed) > 16) { // building hit
        V.damageCar(car, Math.abs(car.speed) * 0.32);
        G.player.hurt(Math.abs(car.speed) * 0.14, G.time);
        G.shake = Math.min(0.7, Math.abs(car.speed) / 90);
        crashSound();
        car.speed *= -0.22;
      } else if (before - after > 0.2) car.speed *= 0.6;
      car.mesh.rotation.y = car.angle;
      // run over peds / bump other cars
      for (const ped of G.peds.list) {
        if (ped.down) continue;
        if (Math.hypot(ped.pos.x - car.pos.x, ped.pos.z - car.pos.z) < 4.4 && Math.abs(car.speed) > 6) {
          G.peds.knockDown(ped);
          G.onCrime('ped', car.pos);
          car.speed *= 0.82;
        }
      }
      for (const other of cars) {
        if (other === car) continue;
        const d = Math.hypot(other.pos.x - car.pos.x, other.pos.z - car.pos.z);
        if (d < 7.6 && d > 0.01) {
          const push = (7.6 - d) / 2;
          const nx = (other.pos.x - car.pos.x) / d, nz = (other.pos.z - car.pos.z) / d;
          other.pos.x += nx * push; other.pos.z += nz * push;
          if (Math.abs(car.speed) > 18) {
            V.damageCar(other, 9); crashSound(); G.shake = Math.max(G.shake, 0.3);
            if (other.kind === 'police') G.onCrime('copcar', car.pos);
            car.speed *= 0.55;
          }
        }
      }
      spinWheels(car, dt);
    },
    update(dt, G) {
      for (const car of cars) {
        if (car.kind === 'traffic' && !car.dead) {
          moveTraffic(car, dt, G);
        }
        if (car.health < 55 || car.burning) {
          car.smokeT -= dt;
          if (car.smokeT <= 0) {
            car.smokeT = car.burning ? 0.09 : 0.2;
            puff(car.pos.x, 3.4, car.pos.z, car.burning, car.burning);
          }
        }
        if (car.burning && Math.random() < dt * 6) puff(car.pos.x, 2.4, car.pos.z, false, false);
      }
      for (const p of puffs) {
        if (!p.s.visible) continue;
        p.life -= dt;
        if (p.life <= 0) { p.s.visible = false; p.s.material.opacity = 0; continue; }
        p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
        p.s.material.opacity = 0.6 * (p.life / p.max);
        const sc = p.s.scale.x + dt * 4.2; p.s.scale.set(sc, sc, 1);
      }
    },
  };

  function spinWheels(car, dt) {
    const w = car.mesh.userData.wheels;
    if (!w) return;
    for (const wheel of w) wheel.rotation.x += car.speed * dt / 1.05;
  }

  function moveTraffic(car, dt, G) {
    let sp = car.speed;
    // slow down if the player (or their car) is right ahead
    const aheadX = car.pos.x + Math.sin(car.angle) * 13, aheadZ = car.pos.z + Math.cos(car.angle) * 13;
    const target = G.player.inCar ? G.player.inCar.pos : G.player.pos;
    if (Math.hypot(target.x - aheadX, target.z - aheadZ) < 8) sp = Math.min(sp, 4);
    if (car.axis === 'z') {
      car.pos.z += car.dir * sp * dt;
      const rx = VX.reduce((a, b) => Math.abs(b - car.pos.x) < Math.abs(a - car.pos.x) ? b : a, VX[0]);
      car.pos.x += ((rx + car.lane) - car.pos.x) * Math.min(1, dt * 2);
      for (const hz of HZ) {
        if (Math.abs(car.pos.z - hz) < 3 && rng() < 0.3) { // turn onto the cross street
          car.axis = 'x'; car.dir = rng() < 0.5 ? 1 : -1; car.lane = -car.dir * 7;
          car.pos.z = hz + car.lane * 0 + (hz - car.pos.z);
          car.pos.z = hz; car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          break;
        }
      }
      if (car.pos.z > 452) { car.dir = -1; car.lane = -7; car.angle = Math.PI; }
      if (car.pos.z < -452) { car.dir = 1; car.lane = 7; car.angle = 0; }
    } else {
      car.pos.x += car.dir * sp * dt;
      const rz = HZ.reduce((a, b) => Math.abs(b - car.pos.z) < Math.abs(a - car.pos.z) ? b : a, HZ[0]);
      car.pos.z += ((rz + car.lane) - car.pos.z) * Math.min(1, dt * 2);
      for (const vx of VX) {
        if (Math.abs(car.pos.x - vx) < 3 && rng() < 0.3) {
          car.axis = 'z'; car.dir = rng() < 0.5 ? 1 : -1; car.lane = car.dir * 7;
          car.pos.x = vx; car.angle = car.dir > 0 ? 0 : Math.PI;
          break;
        }
      }
      if (car.pos.x > 612) { car.dir = -1; car.lane = 7; car.angle = -Math.PI / 2; }
      if (car.pos.x < -612) { car.dir = 1; car.lane = -7; car.angle = Math.PI / 2; }
    }
    car.mesh.rotation.y = car.angle;
    collideCircle(car.pos, 3.4, []);
    spinWheels({ mesh: car.mesh, speed: sp }, dt);
    car.mesh.position.y = 0;
  }

  return V;
}
