// The three heist levels of The Midnight Vault.
//
// Map legend (each row is padded with walls to COLS tiles by parseLevel):
//   '#' wall   '.' floor   'C' crate (cover: blocks movement and sight)
//   'P' thief's start   'E' getaway door   'D' diamond   'g' gold bag   'a' painting
// Guards and cameras are listed separately: guards walk the waypoints in order,
// cameras sit on a wall tile and sweep their vision cone around a base angle.
import { COLS } from './config.js';

const LEVEL_MAPS = [
  {
    name: 'The Gallery',
    intro: 'A quiet art gallery after closing. Two guards, one camera, four pieces to lift.',
    parSeconds: 90,
    map: ['########################',
      '#P....#......#....g...E#',
      '#.....#..C...#....#....#',
      '#..C..#......#....#....#',
      '#.....#..a...#....#....#',
      '#.....######.#....#....#',
      '#..........#.#....#.D..#',
      '#.C....#...#.#....#....#',
      '#......#...#.#.C..#....#',
      '#..g...#...#.#....#....#',
      '#......#...#.#....#....#',
      '#......#...#......#....#',
      '#......#...#####..#....#',
      '#......#..........#....#',
      '########################'],
    guards: [
      { waypoints: [[3, 7], [3, 12]] },
      { waypoints: [[20, 2], [20, 12]] },
    ],
    cameras: [{ tile: [13, 6], angle: 0, sweep: 0.7 }],
  },
  {
    name: 'The Vault Floor',
    intro: 'The bank vault floor. Three guards, two cameras, and the diamond in the middle.',
    parSeconds: 110,
    map: ['########################',
      '#P...#.....#.....g....E#',
      '#....#..C..#..C..#.....#',
      '#.C..#.....#.....#.....#',
      '#....#..a..#..D..#.....#',
      '#....######..####.#..g.#',
      '#..........#.....#.....#',
      '#..C....#..#..C..#.....#',
      '#.......#..#.....#.....#',
      '#.g.....#..#..a..#.....#',
      '#.......#..#.....#..D..#',
      '#..C....#..#..C..#.....#',
      '#.......#..#.....#.....#',
      '#.......#..#.....#.....#',
      '########################'],
    guards: [
      { waypoints: [[2, 7], [2, 12]] },
      { waypoints: [[12, 2], [12, 12]] },
      { waypoints: [[20, 2], [20, 12]] },
    ],
    cameras: [
      { tile: [5, 5], angle: 0, sweep: 0.7 },
      { tile: [16, 5], angle: Math.PI, sweep: 0.7 },
    ],
  },
  {
    name: 'The Penthouse Vault',
    intro: 'The penthouse vault. Four guards, three cameras, six pieces — and no easy way out.',
    parSeconds: 130,
    map: ['########################',
      '#P....#....#.....#....E#',
      '#..C..#....#..C..#.....#',
      '#.....#....#.....#.....#',
      '#..a..#..D.#.....#.g...#',
      '#.....#....#.##.##.#...#',
      '#.....#....#.....#.#...#',
      '#.....#....#..C..#.#...#',
      '#..g..#....#.....#.#...#',
      '#.....######..C..#.#..D#',
      '#..........#.....#.#...#',
      '#.C....#...#..g..#.#...#',
      '#......#...#.....#.#...#',
      '#......#...#.....#.....#',
      '########################'],
    guards: [
      { waypoints: [[3, 6], [3, 12]] },
      { waypoints: [[9, 1], [9, 7]] },
      { waypoints: [[15, 2], [15, 12]] },
      { waypoints: [[20, 2], [20, 12]] },
    ],
    cameras: [
      { tile: [6, 8], angle: 0, sweep: 0.7 },
      { tile: [11, 8], angle: Math.PI / 2, sweep: 0.6 },
      { tile: [17, 4], angle: Math.PI, sweep: 0.7 },
    ],
  },
];

/** Read one level's map text into walls, crates, loot, start and exit. */
export function parseLevel(def) {
  const walls = [];
  const crates = [];
  const loot = [];
  let start = { x: 60, y: 60 };
  let exit = { x: 900, y: 60 };
  def.map.forEach((rowText, row) => {
    const rowPadded = rowText.padEnd(COLS, '#').slice(0, COLS);
    for (let col = 0; col < COLS; col += 1) {
      const ch = rowPadded[col];
      const cx = col * 40 + 20;
      const cy = row * 40 + 20;
      if (ch === '#') walls.push({ x: col * 40, y: row * 40, w: 40, h: 40 });
      else if (ch === 'C') crates.push({ x: col * 40, y: row * 40, w: 40, h: 40 });
      else if (ch === 'P') start = { x: cx, y: cy };
      else if (ch === 'E') exit = { x: cx, y: cy };
      else if (ch === 'D') loot.push({ kind: 'diamond', x: cx, y: cy, taken: false });
      else if (ch === 'g') loot.push({ kind: 'gold', x: cx, y: cy, taken: false });
      else if (ch === 'a') loot.push({ kind: 'art', x: cx, y: cy, taken: false });
    }
  });
  return { walls, crates, loot, start, exit };
}

export const LEVELS = LEVEL_MAPS;
export const LEVEL_COUNT = LEVEL_MAPS.length;
