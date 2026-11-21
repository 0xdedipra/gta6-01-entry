// Solmara Heat — tuning constants and palette for the whole game.
export const WORLD_W = 2400;
export const WORLD_H = 1800;
export const ROAD_HALF = 58;            // half width of every road
export const VX = [170, 570, 970, 1370, 1770, 2170]; // vertical road centre lines
export const HY = [170, 550, 930, 1310];             // horizontal road centre lines
export const BEACH_Y = 1500;             // sand starts here
export const SEA_Y = 1650;               // open water starts here
export const PLAYER_SPEED = 150;
export const PLAYER_SPRINT = 235;
export const CAR_TOP = 430;
export const CAR_REVERSE = 130;
export const COP_TOP = 400;
export const SAVE_KEY = 'solmara-heat-save-v1';
export const COLORS = {
  asphalt: '#3c3f4a', lane: '#f7d774', sidewalk: '#9aa0a8', block: '#565064',
  sand: '#ecd28f', sea: '#1f7f9e', seaDeep: '#166a8c',
  player: '#ffd23f', neon: ['#ff5d8f', '#22d3ee', '#facc15', '#a3e635', '#f472b6', '#38bdf8'],
  carPaint: ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#ecf0f1', '#e67e22', '#95a5a6'],
};
