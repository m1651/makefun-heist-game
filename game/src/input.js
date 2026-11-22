// input.js — keyboard and mouse state for the heist.
// WASD / arrows move, Shift sneaks, E tosses a coin, Space grabs loot,
// P pauses, Enter / R starts and restarts.
export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, clicked: false };
  const pressed = new Set();

  function keyName(e) {
    if (e.key === ' ') return 'Space';
    if (e.key.length === 1) return e.key.toLowerCase();
    return e.key;
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) e.preventDefault();
    if (!e.repeat) pressed.add(k);
    keys.add(k);
    if (e.key === 'Shift') keys.add('Shift');
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(keyName(e));
    if (e.key === 'Shift') keys.delete('Shift');
  });
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', () => { mouse.clicked = true; });

  return {
    keys,
    mouse,
    // True once for the frame after the key went down.
    wasPressed(name) { return pressed.has(name); },
    endFrame() { pressed.clear(); mouse.clicked = false; },
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    sneaking() { return keys.has('Shift'); },
  };
}
