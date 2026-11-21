# gta6-01-entry

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/0xdedipra/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/0xdedipra/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

## Solmara Heat — Isle of Ash

An original 3D open-world crime story set on Solmara, a volcanic island in a
wide blue sea. Raka, a deckhand, steps off the ferry at Pelabuhan dock owing
money to the Voss family. Fixer Mara Voss offers him one way out: drive,
deliver, disappear — if the mountain lets him. Everything is drawn in code
with three.js: no image, audio or font files, no network, just static files
under `game/`.

**The story, in three acts.** Act I — The Ferry: meet Mara and steal the gold
car. Act II — Ash Money: deliver it to Mara's Garage and run the beach
checkpoint. Act III — The Mountain Price: lose the heat and settle the debt.
The loop then repeats with a new gold car, and free roam never closes.

**Five districts.** Pelabuhan (the south dock and ferry), Pasar Senja (the
centre-west market), Kota Tua (the centre-east old town), Bukit Kala (the
north heights, under the glowing HOTEL KALA sign) and Ladang Abu (the ash
fields at the foot of Kala's volcano, which smokes over the whole island).
The HUD names the district you are in and toasts each new one you enter.

**The arsenal.** Five weapons — fists, pistol, SMG, shotgun and rifle (with a
right-mouse zoom) — switched with 1–5, the wheel or Q, reloaded with R. The
SMG, shotgun and rifle start locked in glowing crates around the island;
ammo boxes and clinic health packs keep you going, and the clinic also hands
out body armour that soaks damage before your health does. Cars smoke, burn
and die under fire; pedestrians flee or fall; every crime feeds the wanted
stars, and the police answer with flashing light bars, rams and a busted
meter.

**The climb.** Missions pay cash and RP. RP climbs a five-rank ladder —
Deckhand, Runner, Wheelman, Fixer, Ashking — shown on the HUD next to the
in-game clock (the island day starts at 07:12), the armour bar, the weapon
slot panel and the live minimap with police, objectives and crates. Pause
with P or Esc for the big island map: the story so far, your rank, and the
crew roster — Mara Voss recruited; Bimo the wheelman, Sari the hacker and
Darto the muscle still locked.

## How it is built

- `game/index.html` — the page; loads the vendored three.js, then the game.
- `game/src/city.js` — the island: road grid, buildings and neon signs, park,
  gas station, garage, clinic, beach, ferry and dock, the volcano and its
  smoke, plus the collision data every mover uses.
- `game/src/story.js` — the Isle of Ash frame: Raka's intro, the three acts,
  the five districts, the rank ladder and the crew.
- `game/src/player.js` — blocky characters: Raka (who spawns at the dock)
  and the pedestrians who wander, flee and fall.
- `game/src/vehicles.js` — parked and traffic cars, the gold car, driving
  physics, crash and fire damage.
- `game/src/police.js` — wanted stars, the chasing squad, the busted meter.
- `game/src/weapons.js` — the five weapons, gun models, tracers, and the
  crate / ammo / health / armour pickups.
- `game/src/missions.js` — Mara's act-framed mission loop and the beacon
  pillar, floating cone and ground ring that mark the target.
- `game/src/hud.js` — cash, health, armour, rank and RP, clock, district
  toasts, minimap, the sunset title screen and the pause island map.
- `game/src/input.js`, `game/src/audio.js` — keyboard/mouse state and the
  WebAudio synth sounds.
- `game/src/main.js` — boot, camera, game loop and the screen flow.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` via `buildDossier`.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Controls: WASD or arrows to move, E to enter/exit a car, mouse to aim and click to punch or shoot, P to pause, M to mute.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7h35kkm4&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
