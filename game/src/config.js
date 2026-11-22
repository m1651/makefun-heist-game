// config.js — tuning constants and the three museum levels for The Gilded Fox.
// Tile legend: # wall, . floor, C crate (cover, blocks sight), P plant (cover),
// V vent shaft (walkable, blocks sight), G gold bar, D diamond, A painting,
// E exit door, S player start, 1/2/3 guard spawn, K camera mount.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

export const PLAYER_SPEED = 175;      // px per second, walking
export const SNEAK_SPEED = 95;        // px per second, sneaking
export const SNEAK_DETECT = 0.45;     // detection rate multiplier while sneaking
export const GUARD_SPEED = 62;
export const GUARD_ALERT_SPEED = 108;
export const DETECT_RANGE = 265;
export const CAMERA_RANGE = 300;
export const CONE_HALF_ANGLE = 0.62;  // radians, ~35 degrees each side
export const ALARM_PER_SECOND = 34;   // seen by a guard, at point blank
export const CAMERA_ALARM_PER_SECOND = 46;
export const ALARM_DECAY_PER_SECOND = 9;
export const ALARM_CAUGHT_AT = 100;
export const ALARM_AFTER_CAUGHT = 45;
export const START_LIVES = 3;
export const START_COINS = 3;
export const LOOT_SCORES = { G: 150, D: 300, A: 250 };
export const GHOST_BONUS = 400;       // finish a level with alarm never over 50
export const TIME_BONUS_PER_SECOND = 5;

export const LEVELS = [
  {
    name: 'Level 1 — The Gallery',
    hint: 'Grab every piece of loot, then slip out the green door. Shift = sneak. E = toss a coin.',
    map: [
      '################################',
      '#S....C........#.......G.......#',
      '#.....C........#.......#.......#',
      '#..P..........D........#...C...#',
      '#..............#.......#.......#',
      '#..####........#...1...#...A...#',
      '#..#...........#.......#.......#',
      '#..#..C....P...........#.......#',
      '#..#...................#...C...#',
      '#..####...######.......#.......#',
      '#.........#....#..2............#',
      '#.C.......#....#.......####....#',
      '#.........#....#.......#.......#',
      '#....G....#....D.......#...E...#',
      '#.........#...........#........#',
      '#..P......#....C......#...P....#',
      '#....2....#...........#........#',
      '################################',
    ],
    guards: [
      { spawn: [19, 5], waypoints: [[19, 5], [19, 12], [25, 12], [25, 5]], pause: 1.2 },
      { spawn: [5, 16], waypoints: [[5, 16], [5, 10], [12, 10], [12, 16]], pause: 1.0 },
      { spawn: [21, 10], waypoints: [[21, 10], [27, 10], [27, 15], [21, 15]], pause: 0.8 },
    ],
    cameras: [
      { at: [14, 1], baseAngle: Math.PI / 2, sweep: 1.1, speed: 0.55 },
      { at: [29, 9], baseAngle: Math.PI, sweep: 0.9, speed: 0.7 },
    ],
  },
  {
    name: 'Level 2 — The Vault Hall',
    hint: 'Cameras sweep the hall. Vents (V) hide you from every eye — use them.',
    map: [
      '################################',
      '#S...V........#.......D........#',
      '#....V........#.......#........#',
      '#....V...C....#...1...#....G...#',
      '#....V........#.......#........#',
      '#....VVVVVVVVV#.......#........#',
      '#........C....#.......#...A....#',
      '#..P..........#.......#........#',
      '#.......2.....#...P...#........#',
      '#.............#.......#........#',
      '#..##..##.....####.####....C...#',
      '#..#....#......................#',
      '#..#..G.#....C......3....P.....#',
      '#..#....#......................#',
      '#..######....D......#......E...#',
      '#.............#....#...........#',
      '#..C....P.....#....#.....C.....#',
      '################################',
    ],
    guards: [
      { spawn: [19, 2], waypoints: [[19, 2], [19, 8], [26, 8], [26, 2]], pause: 0.9 },
      { spawn: [9, 8], waypoints: [[9, 8], [9, 15], [15, 15], [15, 8]], pause: 1.1 },
      { spawn: [20, 12], waypoints: [[20, 12], [27, 12], [27, 16], [20, 16]], pause: 0.7 },
    ],
    cameras: [
      { at: [16, 1], baseAngle: Math.PI / 2, sweep: 1.2, speed: 0.6 },
      { at: [1, 9], baseAngle: 0, sweep: 1.0, speed: 0.8 },
      { at: [30, 13], baseAngle: Math.PI, sweep: 0.8, speed: 0.65 },
    ],
  },
  {
    name: 'Level 3 — The Rooftop Escape',
    hint: 'Last job. The vault is open, the patrols are doubled — get in, get rich, get out.',
    map: [
      '################################',
      '#S....C.......V.......D........#',
      '#.....C.......V.......#........#',
      '#..P..........V...1...#....A...#',
      '#.............V.......#........#',
      '#..####.......VVVVVVVV#........#',
      '#..#..........#.......#........#',
      '#..#..C...P...#...2...#....G...#',
      '#..#..........#.......#........#',
      '#..####...#####.......####.....#',
      '#.........#.....#........#.....#',
      '#.C...3...#..D..#....P...#..E..#',
      '#.........#.....#........#.....#',
      '#....G....#.....#....C...#.....#',
      '#.........#.....#........#.....#',
      '#..P......#..C..#........#..P..#',
      '#....2....#.....#........#.....#',
      '################################',
    ],
    guards: [
      { spawn: [19, 2], waypoints: [[19, 2], [19, 6], [26, 6], [26, 2]], pause: 0.8 },
      { spawn: [20, 7], waypoints: [[20, 7], [20, 13], [26, 13], [26, 7]], pause: 0.9 },
      { spawn: [6, 11], waypoints: [[6, 11], [6, 16], [13, 16], [13, 11]], pause: 1.0 },
      { spawn: [5, 16], waypoints: [[5, 16], [12, 16], [12, 11], [5, 11]], pause: 0.7 },
    ],
    cameras: [
      { at: [16, 1], baseAngle: Math.PI / 2, sweep: 1.3, speed: 0.7 },
      { at: [30, 5], baseAngle: Math.PI, sweep: 1.0, speed: 0.8 },
      { at: [15, 16], baseAngle: -Math.PI / 2, sweep: 1.1, speed: 0.6 },
    ],
  },
];
