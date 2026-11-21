# gta6-01-entry

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/0xdedipra/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/0xdedipra/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

## Solmara Heat

Solmara Heat is an original top-down 2D open-world crime sandbox set in the fictional coastal city of Solmara. The city is generated procedurally — a road grid, buildings, a beach and the open sea — and populated with moving traffic and wandering pedestrians.

What you can do:

- **Explore on foot or by car.** Any parked or moving car can be stolen and driven; traffic cars drive the road network and react to collisions.
- **Live with a wanted level.** Crimes raise your wanted stars, police cars give chase, and a busted meter fills while officers close in — get caught and you are busted; break line of sight and the heat cools down.
- **Fight with a pistol.** Mouse-aimed shooting with muzzle flash, hit feedback and health for you and your targets.
- **Run a 3-mission chain.** Fixer Mara Voss hands out a connected sequence of jobs across the city, with objectives, markers and payouts.
- **Read the city at a glance.** A minimap HUD shows streets, your position, mission markers, police and wanted stars, plus health and cash.
- **Keep your progress.** Cash, mission progress and settings are saved in the browser's localStorage.
- **Hear it.** Movement, engines, sirens, gunfire and UI sounds are synthesised live with WebAudio — no audio files.

Everything is drawn with Canvas 2D and plain JavaScript: no images, no fonts, no network requests, no build step.

## How it is built

Each file in `game/src/` has one clear job:

- `world.js` — the procedural city of Solmara: road grid, buildings, beach and sea, plus collision data
- `vehicles.js` — car definitions, driving physics, parked cars and the traffic system
- `pedestrians.js` — pedestrian spawning, wandering and reactions
- `police.js` — the wanted-star system, police spawning, chases and the busted meter
- `missions.js` — Mara Voss's 3-mission chain: objectives, markers, triggers and payouts
- `combat.js` — pistol shooting, melee, damage and health
- `hud.js` — the HUD and the live minimap
- `audio.js` — WebAudio-synthesised sound effects and sirens
- `input.js` — keyboard and mouse input
- `main.js` — the game loop, screens (title, pause, busted, complete) and save/load via localStorage

`main.ts` at the repository root is the make.fun hand-in driver; the game itself is the static site under `game/`.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Controls: WASD or arrows to move, E to enter/exit a car, mouse to aim and click to punch or shoot, P to pause, M to mute.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7h35kkm4&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
