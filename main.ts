// main.ts — the hand-in program for Solmara Heat 3D (Node 22, stdlib only).
// It copies this repository's game/ and screenshots/ folders into the output
// directory and writes dossier.json there, produced by buildDossier from
// vendor/makefun-game.ts. Outside the grader, MAKEFUN_OUTPUT_DIR names the
// output directory instead of /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The output directory itself belongs to the grader: this program creates it
// when absent and fills it, but never deletes it or anything inside it.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The caps the scorer enforces, passed to buildDossier so the dossier it
// writes describes exactly the entry the caps allow.
export const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Copy one top-level folder of the repository into the output directory.
export function handOver(folder: string): void {
  const from = join(repoDir, folder);
  if (!existsSync(from)) return;
  const to = join(outDir, folder);
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

// Fill the output directory with the game and its screenshots, then write
// the dossier over the result so it describes the files exactly as handed in.
mkdirSync(outDir, { recursive: true });
handOver('game');
handOver('screenshots');
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, CAPS));
