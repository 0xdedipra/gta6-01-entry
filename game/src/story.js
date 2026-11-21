// story.js — the Isle of Ash frame: Raka's debt, Mara Voss's three acts,
// the island's five districts, and the rank ladder the HUD climbs.
// Pure data + position lookups; every other module reads from here.

export const HERO = 'RAKA';
export const INTRO_LINES = [
  'Raka steps off the ferry at Pelabuhan dock with empty pockets',
  'and a debt owed to the Voss family. Fixer Mara Voss offers him',
  'one way out: drive, deliver, disappear — if the mountain lets him.',
];

export const ACTS = [
  { n: 'I', name: 'THE FERRY', blurb: 'Meet Mara. Steal the gold car.' },
  { n: 'II', name: 'ASH MONEY', blurb: 'Deliveries and the beach run.' },
  { n: 'III', name: 'THE MOUNTAIN PRICE', blurb: 'Lose the heat. Settle the debt.' },
];

// Which act a mission stage belongs to (stages live in missions.js).
export function actForStage(stage) {
  if (stage <= 0) return ACTS[0];
  if (stage <= 2) return ACTS[1];
  return ACTS[2];
}

// Districts, matched by world position. North is -z, the dock is +z.
export const DISTRICTS = [
  { name: 'LADANG ABU', sub: 'ash fields', at: (x, z) => z <= -349 },
  { name: 'BUKIT KALA', sub: 'the heights', at: (x, z) => z <= -129 },
  { name: 'PELABUHAN', sub: 'the dock', at: (x, z) => z >= 300 },
  { name: 'PASAR SENJA', sub: 'the market', at: (x) => x < 0 },
  { name: 'KOTA TUA', sub: 'old town', at: () => true },
];
export function districtAt(x, z) {
  for (const d of DISTRICTS) if (d.at(x, z)) return d;
  return DISTRICTS[DISTRICTS.length - 1];
}

// Rank ladder: RP is earned from mission payouts and objectives.
export const RANKS = [
  { rp: 0, name: 'DECKHAND' },
  { rp: 300, name: 'RUNNER' },
  { rp: 800, name: 'WHEELMAN' },
  { rp: 1500, name: 'FIXER' },
  { rp: 2600, name: 'ASHKING' },
];
export function rankFor(rp) {
  let cur = RANKS[0], next = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (rp >= RANKS[i].rp) { cur = RANKS[i]; next = RANKS[i + 1] || null; }
  }
  const span = next ? next.rp - cur.rp : 1;
  const frac = next ? Math.min(1, (rp - cur.rp) / span) : 1;
  return { idx: RANKS.indexOf(cur) + 1, name: cur.name, next, frac };
}

export const CREW = [
  { name: 'Mara Voss', role: 'Fixer', status: 'Recruited' },
  { name: 'Bimo Hartono', role: 'Wheelman', status: 'Locked' },
  { name: 'Sari Wulandari', role: 'Hacker', status: 'Locked' },
  { name: 'Darto', role: 'Muscle', status: 'Locked' },
];
