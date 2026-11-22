// world.js — parses a level map into walls, cover, loot and the exit,
// and answers collision and line-of-sight questions for guards and cameras.
import { TILE, COLS, ROWS, LOOT_SCORES } from './config.js';

const SOLID = new Set(['#', 'C', 'P']);
const SIGHT_BLOCKERS = new Set(['#', 'C', 'P', 'V']);

export function parseLevel(def) {
  const walls = [];
  const loot = [];
  let start = { x: TILE * 1.5, y: TILE * 1.5 };
  let exit = { x: TILE * 29.5, y: TILE * 13.5 };
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = def.map[y][x];
      if (SOLID.has(ch)) walls.push({ x, y, kind: ch });
      if (ch === 'S') start = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      if (ch === 'E') exit = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      if (LOOT_SCORES[ch]) loot.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, kind: ch, taken: false });
    }
  }
  return { walls, loot, start, exit };
}

export function tileAt(def, px, py) {
  const x = Math.floor(px / TILE);
  const y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return '#';
  return def.map[y][x];
}

export function isSolidTile(def, px, py) {
  return SOLID.has(tileAt(def, px, py));
}

// Circle vs. solid tiles: try to move, sliding along walls.
export function moveWithCollision(def, pos, dx, dy, radius) {
  const nx = pos.x + dx;
  if (!hitsSolid(def, nx, pos.y, radius)) pos.x = nx;
  const ny = pos.y + dy;
  if (!hitsSolid(def, pos.x, ny, radius)) pos.y = ny;
}

function hitsSolid(def, x, y, r) {
  for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, -r], [0, r], [-r, 0], [r, 0]]) {
    if (isSolidTile(def, x + ox, y + oy)) return true;
  }
  return false;
}

// True when a straight line between two points crosses no sight-blocking tile.
export function hasLineOfSight(def, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 3)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (SIGHT_BLOCKERS.has(tileAt(def, ax + dx * t, ay + dy * t))) return false;
  }
  return true;
}

// Is the player standing inside a vent shaft? Vents hide the player completely.
export function inVent(def, x, y) {
  return tileAt(def, x, y) === 'V';
}

// Breadth-first search over walkable tiles; returns a list of tile centres
// from the start tile to the goal tile, or null when no path exists.
export function findPath(def, fromPx, fromPy, toPx, toPy) {
  const sx = Math.floor(fromPx / TILE);
  const sy = Math.floor(fromPy / TILE);
  const gx = Math.floor(toPx / TILE);
  const gy = Math.floor(toPy / TILE);
  const key = (x, y) => y * COLS + x;
  const prev = new Map();
  const queue = [[sx, sy]];
  prev.set(key(sx, sy), null);
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === gx && y === gy) {
      const path = [];
      let cur = key(x, y);
      while (cur !== null) {
        path.unshift({ x: (cur % COLS + 0.5) * TILE, y: (Math.floor(cur / COLS) + 0.5) * TILE });
        cur = prev.get(cur);
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (SOLID.has(def.map[ny][nx])) continue;
      if (prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), key(x, y));
      queue.push([nx, ny]);
    }
  }
  return null;
}
