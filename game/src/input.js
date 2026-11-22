// Keyboard and mouse input for The Midnight Vault.
// WASD / arrows move, Shift sneaks, a mouse click throws a decoy coin,
// Enter or a click starts and advances screens.
import { FIELD } from './config.js';

const MOVE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

/** Track the keys held down and the latest click, for the game loop to read. */
export function createInput(canvas) {
  const held = new Set();
  const input = {
    keys: held,
    click: null, // { x, y } in field coordinates, consumed by the loop
    confirm: false, // Enter pressed or a click on a menu screen
    /** Movement direction (-1..1 on each axis) from the keys held down. */
    direction() {
      let mx = 0;
      let my = 0;
      for (const key of held) {
        const dir = MOVE_KEYS[key];
        if (dir) { mx += dir[0]; my += dir[1]; }
      }
      return { mx, my };
    },
    sneaking() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    takeClick() {
      const c = input.click;
      input.click = null;
      return c;
    },
    takeConfirm() {
      const c = input.confirm;
      input.confirm = false;
      return c;
    },
  };

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Enter' || event.code === 'Space') input.confirm = true;
    held.add(event.code);
    if (MOVE_KEYS[event.code] || event.code.startsWith('Arrow')) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    // Map the click into field coordinates: the HUD bar is 44 px tall.
    const x = ((event.clientX - rect.left) / rect.width) * FIELD.width;
    const y = ((event.clientY - rect.top) / rect.height) * (FIELD.height + 44) - 44;
    input.click = { x, y };
    input.confirm = true;
  });
  return input;
}
