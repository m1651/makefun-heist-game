// Shared constants for The Midnight Vault: field size, speeds, detection and scoring.
// Every other module reads these, so tuning the game means editing this file alone.

// The play field is a 24 x 15 tile grid; each tile is 40 px, so the canvas is 960 x 600.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;
export const FIELD = { width: COLS * TILE, height: ROWS * TILE };

// The thief.
export const PLAYER = {
  radius: 13,
  speed: 175, // px per second while walking
  sneakSpeed: 95, // px per second while sneaking (Shift): slower, harder to spot
  sneakDetectRange: 0.55, // a sneaking thief is only seen at 55% of the cone's range
};

// Guards walk their patrol routes and investigate thrown coins.
export const GUARD = {
  radius: 13,
  patrolSpeed: 62,
  investigateSpeed: 105,
  coneRange: 190, // how far a guard's vision cone reaches
  coneHalfAngle: 0.61, // radians either side of the facing direction (~35 degrees)
  alarmPerSecond: 55, // alarm gained per second while the thief is inside a cone
};

// Wall cameras sweep back and forth and never move from their mount.
export const CAMERA = {
  coneRange: 175,
  coneHalfAngle: 0.5,
  alarmPerSecond: 70,
  sweepSpeed: 0.55, // radians per second
};

// The alarm meter: 0 is calm, 100 is caught. It drains when nobody sees the thief.
export const ALARM = { max: 100, drainPerSecond: 14, caughtAt: 100 };

// Loot values in score points.
export const LOOT_VALUE = { diamond: 500, gold: 200, art: 150 };
export const COIN_BONUS = 100; // points per unused decoy coin at the end of a level
export const TIME_BONUS_PER_SECOND = 10; // points per second under par at the end of a level

// How many decoy coins the thief carries into each level, and how far a thrown
// coin's clink carries: guards inside this radius walk over to investigate it.
export const DECOY = { count: 3, lureRadius: 170 };

// Fixed-step simulation, so a staged screenshot scene always plays the same way.
export const STEP = 1 / 60;
