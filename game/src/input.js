// input.js — keyboard and mouse state for the whole game.
// One shared `keys` set (held), one `pressed` set (edge, cleared each frame),
// and a mouse record with position, buttons and wheel delta.
export const keys = new Set();
export const pressed = new Set();
export const mouse = { x: 0, y: 0, down: false, rightDown: false, clicked: false, wheel: 0 };

export function attachInput(canvas) {
  addEventListener('keydown', (e) => {
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
    if (e.button === 2) mouse.rightDown = true;
  });
  addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
    if (e.button === 2) mouse.rightDown = false;
  });
  canvas.addEventListener('wheel', (e) => { mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function endFrame() {
  pressed.clear();
  mouse.clicked = false;
  mouse.wheel = 0;
}

// Movement axis from the keys: x = strafe (-1..1), z = forward (-1..1).
export function axis() {
  let x = 0, z = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
  return { x, z };
}

export function down(code) { return keys.has(code); }
export function hit(code) { return pressed.has(code); }
