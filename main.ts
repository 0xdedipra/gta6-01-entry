// Solmara Heat — hand-in program (Node 22, standard library only).
// The game itself is the game/ folder: plain static files a desktop browser
// loads fully offline (game/index.html plus its ES modules, no library, no
// network). This program copies game/ and screenshots/ from beside this file
// into the output directory and writes the dossier the judge reads, using the
// vendored make.fun library in vendor/makefun-game.ts.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output tree and copy the entry into it. The output directory
// itself is the grader's mount: it is only ever created (if absent) and
// filled, never deleted.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Write the dossier with the same caps the scorer enforces: at most 4
// screenshots of 256 KiB each, at most 993 files / 48 MiB under game/, paths
// under 1000 bytes, and the source text capped at 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
