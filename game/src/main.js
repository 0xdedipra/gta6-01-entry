// main.js — boot and glue: scene, third-person camera, the shared game state,
// crime handling, getting in and out of cars, the title / pause / busted /
// wasted flow, and the deterministic ?shot= staging used for screenshots.
import { buildCity, makeRng } from './city.js';
import { createPlayer, createPeds } from './player.js';
import { createVehicles } from './vehicles.js';
import { createPolice } from './police.js';
import { createWeapons } from './weapons.js';
import { createMissions } from './missions.js';
import { createHud } from './hud.js';
import { attachInput, endFrame, hit, mouse } from './input.js';
import { hornSound, bustedSound, toggleMute, setSiren } from './audio.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot') || '';
const SEED = parseInt(params.get('seed') || '7', 10) || 7;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.5, 2200);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
attachInput(canvas);

const rng = makeRng(SEED * 31 + 5);
const city = buildCity(scene, SEED);
const player = createPlayer(scene);
const peds = createPeds(scene, rng);
const vehicles = createVehicles(scene, city, rng);
const police = createPolice(scene, vehicles);
const weapons = createWeapons(scene, player, city);
const missions = createMissions(scene, city);
const hud = createHud();

const G = {
  scene, camera, city, player, peds, vehicles, police, weapons, missions, hud,
  state: 'title', cash: 250, time: 0, camYaw: 0, shake: 0,
  danger: { x: 0, z: 0, t: -99 },
  mouseDown: false, mouseClicked: false, rightDown: false, wheelDelta: 0,
  lastShotCrime: -99, lastCopCrime: -99,
  addCash(n) { G.cash = Math.max(0, G.cash + n); },
  toast(msg) { hud.toast(msg); },
  onCrime(kind, pos) {
    if (kind === 'theft') {
      if (police.wanted < 1) police.setWanted(1, G); else police.lastCrimeT = G.time;
      G.toast('Vehicle stolen!');
    } else if (kind === 'shot') {
      if (G.time - G.lastShotCrime > 4 && police.nearestCopDist(pos) < 999) {
        if (police.wanted > 0 || peds.list.some((p) => !p.down && Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) < 70)) {
          police.addWanted(1, G); G.lastShotCrime = G.time;
        }
      }
    } else if (kind === 'pedshot' || kind === 'ped') {
      police.addWanted(2, G);
      G.danger.x = pos.x; G.danger.z = pos.z; G.danger.t = G.time;
    } else if (kind === 'copcar') {
      if (G.time - G.lastCopCrime > 2) { police.addWanted(2, G); G.lastCopCrime = G.time; }
      G.danger.x = pos.x; G.danger.z = pos.z; G.danger.t = G.time;
    } else if (kind === 'carshot') {
      police.lastCrimeT = G.time;
      G.danger.x = pos.x; G.danger.z = pos.z; G.danger.t = G.time;
    }
  },
  onBusted() {
    if (G.state !== 'playing') return;
    G.state = 'busted';
    bustedSound(); setSiren(false);
    const fine = 150 + police.wanted * 50;
    G.addCash(-fine);
    document.querySelector('#bustedText').textContent =
      `The police walk you to the station. Fine: $${fine}. Mara is not impressed.`;
    hud.show('scr-busted');
  },
};
missions.start(G);
hud.show('scr-title');

function leaveCar() {
  const car = player.inCar;
  if (!car) return;
  player.inCar = null;
  player.group.visible = true;
  player.pos.set(car.pos.x + Math.cos(car.angle) * 6, 0, car.pos.z - Math.sin(car.angle) * 6);
  player.angle = car.angle;
  car.speed = 0;
}
function enterCar(car) {
  player.inCar = car;
  player.group.visible = false;
  if (!car.stolen && car.kind !== 'police') {
    car.stolen = true;
    G.onCrime('theft', car.pos);
  }
  if (car === missions.goldCar) G.toast('Gold car acquired!');
}
function respawnAtClinic() {
  if (player.inCar) leaveCar();
  player.pos.set(city.clinicPos.x, 0, city.clinicPos.z + 24);
  player.health = 100;
  police.setWanted(0, G); police.bustedMeter = 0;
  G.state = 'playing';
  hud.hideScreens();
}
hud.onStart = () => { G.state = 'playing'; hud.hideScreens(); };
hud.onResume = () => { G.state = 'playing'; hud.hideScreens(); };
hud.onBusted = () => respawnAtClinic();
hud.onWasted = () => { G.addCash(-0); respawnAtClinic(); };

// --- deterministic staging for screenshots ---------------------------------
if (SHOT === 'arsenal') {
  G.state = 'playing'; hud.hideScreens();
  player.pos.set(100, 0, 216);
  player.angle = Math.PI; G.camYaw = 0;
  weapons.state.smg.unlocked = true;
  weapons.select('smg');
  police.setWanted(3, G);
  // a smoking wreck ahead, and two police cars rolling in toward the player
  const wreck = vehicles.cars.find((c) => c.kind === 'parked' && !c.isGold) || vehicles.cars[0];
  wreck.mesh.position.set(103, 0, 184); wreck.mesh.rotation.y = 0.6; wreck.angle = 0.6;
  vehicles.damageCar(wreck, 100); // fully burning: a thick dark smoke column
  G.forceAim = true;
  const spots = [[90, 166], [113, 156]];
  police.cars.forEach((c, i) => {
    if (i > 1) return;
    c.active = true;
    c.car.mesh.visible = true;
    c.car.mesh.position.set(spots[i][0], 0, spots[i][1]);
    c.car.angle = Math.PI; c.car.mesh.rotation.y = Math.PI;
    c.car.speed = 10;
  });
} else if (SHOT === 'drive') {
  G.state = 'playing'; hud.hideScreens();
  const car = vehicles.nearestCar(new THREE.Vector3(100, 0, 250), 120);
  if (car) {
    car.mesh.position.set(100, 0, 252); car.angle = Math.PI; car.mesh.rotation.y = Math.PI; car.speed = 34;
    car.stolen = true;
    enterCar(car);
    police.setWanted(1, G);
  }
  G.camYaw = 0;
} else if (SHOT === 'mission') {
  G.state = 'playing'; hud.hideScreens();
  missions.stage = 1;
  player.pos.set(city.garagePos.x - 6, 0, city.garagePos.z + 30);
  player.angle = Math.PI; G.camYaw = 0;
  weapons.select('pistol');
} else if (SHOT === 'title') {
  G.state = 'title';
  player.pos.set(100, 0, 250);
}

// --- camera ------------------------------------------------------------------
let prevMouseX = null, prevMouseY = null, camPitch = 0.34;
function updateCamera(dt) {
  if (prevMouseX !== null && G.state === 'playing' && !player.inCar) {
    G.camYaw -= (mouse.x - prevMouseX) * 0.0042;
    camPitch = Math.max(0.12, Math.min(0.85, camPitch + (mouse.y - prevMouseY) * 0.003));
  }
  prevMouseX = mouse.x; prevMouseY = mouse.y;
  const target = player.inCar ? player.inCar.pos : player.pos;
  if (player.inCar) {
    let da = player.inCar.angle + Math.PI - G.camYaw;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    G.camYaw += da * Math.min(1, dt * 3.2);
  }
  if (G.state === 'title') G.camYaw += dt * 0.07;
  const dist = player.inCar ? 17 : 12.5;
  const fx = -Math.sin(G.camYaw), fz = -Math.cos(G.camYaw);
  const height = (player.inCar ? 6.5 : 5.2) + Math.sin(camPitch) * (player.inCar ? 4 : 6);
  const cx = target.x - fx * dist, cz = target.z - fz * dist;
  camera.position.set(
    cx + (Math.random() - 0.5) * G.shake,
    height + (Math.random() - 0.5) * G.shake * 0.6,
    cz + (Math.random() - 0.5) * G.shake);
  camera.lookAt(target.x + fx * 12, 3.4, target.z + fz * 12);
  const wantFov = (weapons.current === 'rifle' && mouse.rightDown && !player.inCar) ? 34 : 68;
  if (Math.abs(camera.fov - wantFov) > 0.5) { camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 10); camera.updateProjectionMatrix(); }
  G.shake = Math.max(0, G.shake - dt * 1.8);
}

// --- main loop -----------------------------------------------------------------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  G.time += dt;
  G.mouseDown = mouse.down; G.mouseClicked = mouse.clicked; G.rightDown = mouse.rightDown;
  G.wheelDelta = mouse.wheel;

  if (hit('KeyM')) toggleMute();
  if ((hit('KeyP') || hit('Escape')) && (G.state === 'playing' || G.state === 'paused')) {
    if (G.state === 'playing') { G.state = 'paused'; hud.show('scr-pause'); setSiren(false); }
    else { G.state = 'playing'; hud.hideScreens(); }
  }
  if (hit('Enter') && G.state === 'title') hud.onStart();

  if (G.state === 'playing') {
    if (hit('KeyE')) {
      if (player.inCar) leaveCar();
      else {
        const car = vehicles.nearestCar(player.pos, 9.5);
        if (car) enterCar(car);
      }
    }
    if (hit('KeyH') && player.inCar) { hornSound(); G.danger.x = player.inCar.pos.x; G.danger.z = player.inCar.pos.z; G.danger.t = G.time; }
    player.update(dt, G);
    if (player.inCar) {
      vehicles.drive(player.inCar, dt, G);
      player.pos.copy(player.inCar.pos);
    } else if ((mouse.down || mouse.rightDown || G.forceAim) && weapons.current !== 'fists') {
      player.angle = G.camYaw + Math.PI;
      player.group.rotation.y = player.angle;
    }
    police.update(dt, G);
    weapons.update(dt, G);
    missions.update(dt, G);
    if (player.health <= 0) {
      G.state = 'wasted'; setSiren(false);
      hud.show('scr-wasted');
    }
  }
  if (G.state === 'playing' || G.state === 'title') {
    peds.update(dt, G);
    vehicles.update(dt, G);
  }
  city.update(dt);
  updateCamera(dt);
  hud.update(dt, G);
  renderer.render(scene, camera);
  endFrame();
}
frame();
