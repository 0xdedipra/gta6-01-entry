// police.js — the wanted system: stars, a pooled squad of police cars that
// spawn at the city edge and chase, flashing light bars, the BUSTED meter,
// and heat decay when the player breaks away.
import { collideCircle } from './city.js';
import { setSiren } from './audio.js';

export function createPolice(scene, vehicles) {
  const pool = [];
  const P = {
    wanted: 0, bustedMeter: 0, lastCrimeT: -99, decayT: 0, flashT: 0,
    cars: pool,
    setWanted(n, G) {
      P.wanted = Math.max(0, Math.min(5, n));
      if (n > 0) P.lastCrimeT = G.time;
    },
    addWanted(n, G) { P.setWanted(P.wanted + n, G); },
    nearestCopDist(pos) {
      let d = 1e9;
      for (const c of pool) if (c.active) d = Math.min(d, Math.hypot(c.car.pos.x - pos.x, c.car.pos.z - pos.z));
      return d;
    },
    update(dt, G) {
      const target = G.player.inCar ? G.player.inCar.pos : G.player.pos;
      // spawn / retire to match the wanted level
      const want = P.wanted;
      let activeCount = 0;
      for (const c of pool) if (c.active) activeCount++;
      for (const c of pool) {
        if (!c.active && activeCount < want) {
          // appear at a city edge, out of sight
          const edge = Math.floor(Math.random() * 4);
          const spots = [[-620, target.z], [620, target.z], [target.x, -480], [target.x, 470]];
          const [sx, sz] = spots[edge];
          if (Math.hypot(sx - target.x, sz - target.z) > 120) {
            c.car.mesh.position.set(sx, 0, sz);
            c.car.health = 100; c.car.dead = false; c.car.burning = false;
            c.car.mesh.visible = true;
            c.active = true; activeCount++;
          }
        } else if (c.active && activeCount > want) {
          c.active = false; c.car.mesh.visible = false; c.car.mesh.position.y = -60;
          activeCount--;
        }
      }
      // flashing lights
      P.flashT += dt;
      const phase = Math.floor(P.flashT * 5) % 2 === 0;
      // chase
      let anyNear = false;
      for (const c of pool) {
        if (!c.active) continue;
        const car = c.car;
        if (car.dead) continue;
        const lr = car.mesh.userData.lightRed, lb = car.mesh.userData.lightBlue;
        if (lr && lb) {
          lr.material.color.set(phase ? 0xff2222 : 0x551111);
          lb.material.color.set(phase ? 0x113377 : 0x3388ff);
        }
        const dx = target.x - car.pos.x, dz = target.z - car.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 130) anyNear = true;
        const wantAngle = Math.atan2(dx, dz);
        let da = wantAngle - car.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, da * 3 * dt));
        const topSpeed = G.player.inCar ? 57 : 34;
        const goal = dist > 10 ? topSpeed : topSpeed * 0.25;
        car.speed += Math.max(-40 * dt, Math.min(26 * dt, goal - car.speed));
        car.pos.x += Math.sin(car.angle) * car.speed * dt;
        car.pos.z += Math.cos(car.angle) * car.speed * dt;
        collideCircle(car.pos, 3.6, G.city.colliders);
        car.mesh.rotation.y = car.angle;
        const w = car.mesh.userData.wheels;
        if (w) for (const wheel of w) wheel.rotation.x += car.speed * dt / 1.05;
        // ram damage to the player on foot
        if (!G.player.inCar && dist < 5.2 && Math.abs(car.speed) > 12) {
          G.player.hurt(9, G.time);
          G.shake = Math.max(G.shake, 0.35);
          car.speed *= 0.4;
        }
      }
      setSiren(want >= 2 && anyNear && G.state === 'playing');
      // busted meter: a cop close while you are slow or on foot
      const nd = P.nearestCopDist(target);
      const slow = G.player.inCar ? Math.abs(G.player.inCar.speed) < 7 : G.player.speedNow < 9;
      if (want > 0 && nd < 10.5 && slow && G.state === 'playing') {
        P.bustedMeter += dt / 3;
        if (P.bustedMeter >= 1) { P.bustedMeter = 0; G.onBusted(); }
      } else {
        P.bustedMeter = Math.max(0, P.bustedMeter - dt * 0.55);
      }
      // decay: no recent crime and no cop near -> stars fall one by one
      if (want > 0 && G.time - P.lastCrimeT > 9 && nd > 62) {
        P.decayT += dt;
        if (P.decayT > 6.5) { P.decayT = 0; P.setWanted(want - 1, G); P.lastCrimeT = G.time - 4; }
      } else P.decayT = 0;
    },
  };
  for (let i = 0; i < 5; i++) {
    const car = vehicles.addCar('police', 0xf2f2f2, 0, -999, 0, { police: true });
    car.mesh.visible = false; car.mesh.position.y = -60;
    pool.push({ car, active: false });
  }
  return P;
}
