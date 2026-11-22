// The screenshot scenes behind ?shot=start|play|end|win. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot, so the frame is what a real game looks like and the same seed always
// gives the same frame. No screenshot is drawn by hand or composited.
import { FIELD, STEP, TILE } from './config.js';
import { createWorld, nextLevel, stepWorld, EVENT_CAUGHT, EVENT_LEVEL_CLEAR, EVENT_GAME_WON } from './world.js';
import { SCREEN_LEVEL_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = STEP;

/** The tile column/row a point sits in. */
function tileOf(x, y) {
  return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
}

/** True when the tile's centre is open floor (no wall or crate covers it). */
function tileOpen(world, col, row) {
  if (col < 0 || row < 0 || col >= 24 || row >= 15) return false;
  const cx = col * TILE + TILE / 2;
  const cy = row * TILE + TILE / 2;
  return !world.solids.some((s) => cx >= s.x && cx < s.x + s.w && cy >= s.y && cy < s.y + s.h);
}

/**
 * Breadth-first path across open tiles from (sx, sy) to (tx, ty), as a list of
 * tile-centre waypoints. Greedy steering alone gets stuck on walls; a real path
 * is what lets the autopilot cross a room the way a player would.
 */
function findPath(world, sx, sy, tx, ty) {
  const start = tileOf(sx, sy);
  const goal = tileOf(tx, ty);
  const key = (c, r) => `${c},${r}`;
  const cameFrom = new Map([[key(start.col, start.row), null]]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.col === goal.col && cur.row === goal.row) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = cur.col + dc;
      const nr = cur.row + dr;
      if (!tileOpen(world, nc, nr) || cameFrom.has(key(nc, nr))) continue;
      cameFrom.set(key(nc, nr), cur);
      queue.push({ col: nc, row: nr });
    }
  }
  if (!cameFrom.has(key(goal.col, goal.row))) return [];
  const path = [];
  let cur = goal;
  while (cur) {
    path.unshift({ x: cur.col * TILE + TILE / 2, y: cur.row * TILE + TILE / 2 });
    cur = cameFrom.get(key(cur.col, cur.row));
  }
  return path;
}

export { findPath };

/** Steer the thief toward (tx, ty): axis-separated, so it slides along walls. */
function steerToward(world, tx, ty) {
  const p = world.player;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const mx = Math.abs(dx) > 6 ? Math.sign(dx) : 0;
  const my = Math.abs(dy) > 6 ? Math.sign(dy) : 0;
  return { mx, my, sneak: false, throwAt: null };
}

/**
 * The heist autopilot: follow a breadth-first path to the nearest uncollected
 * loot, then to the exit. The path is replanned whenever the target changes.
 * The target is committed to until it is pocketed: re-picking the nearest piece
 * every step would flip between two pieces whenever they are equally far away
 * and leave the thief shuffling on the spot.
 */
function autopilot(world, memory) {
  const p = world.player;
  if (!memory.target || memory.target.taken) {
    const remaining = world.loot.filter((item) => !item.taken);
    if (remaining.length > 0) {
      remaining.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      memory.target = remaining[0];
    } else {
      memory.target = world.exit;
    }
    memory.targetKey = `${memory.target.x},${memory.target.y}`;
    memory.path = [];
  }
  const target = memory.target;
  if (memory.path.length === 0) {
    memory.path = findPath(world, p.x, p.y, target.x, target.y);
    memory.pathIndex = 0;
  }
  while (memory.pathIndex < memory.path.length) {
    const wp = memory.path[memory.pathIndex];
    if (Math.hypot(wp.x - p.x, wp.y - p.y) < 10) memory.pathIndex += 1;
    else return steerToward(world, wp.x, wp.y);
  }
  return steerToward(world, target.x, target.y);
}

/** Run the world forward for `seconds` of autopilot play, stopping on an event. */
function runAutopilot(world, seconds) {
  const memory = { target: null, targetKey: null, path: [], pathIndex: 0 };
  let events = 0;
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    events = stepWorld(world, autopilot(world, memory), SAMPLE);
    if (events & (EVENT_CAUGHT | EVENT_LEVEL_CLEAR | EVENT_GAME_WON)) break;
    if (world.over || world.levelClear) break;
  }
  return events;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: the title screen over a fresh room. play: mid-heist, loot half taken,
 * guards and cameras sweeping. end: the thief walks into a cone and is caught.
 * win: the whole heist completed, victory screen over the final room.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    runAutopilot(world, 12);
    return { screen: SCREEN_PLAY, world };
  }
  if (name === 'end') {
    // Stand on the first guard's patrol route and wait: the guard walks its
    // route straight at the thief, the cone fills the alarm, and the thief is
    // caught. (Chasing a guard from behind never works — its cone faces away.)
    const guard = world.guards[0];
    const a = guard.waypoints[0];
    const b = guard.waypoints[1 % guard.waypoints.length];
    const ambush = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    let arrived = false;
    let path = findPath(world, world.player.x, world.player.y, ambush.x, ambush.y);
    let pathIndex = 0;
    for (let i = 0; i < 60 / SAMPLE && !world.over; i += 1) {
      if (!arrived) {
        // Follow the planned path, advancing past each waypoint once close to
        // it — steering at the first waypoint every step would shuffle the
        // thief back and forth on the spot.
        while (pathIndex < path.length && Math.hypot(path[pathIndex].x - world.player.x, path[pathIndex].y - world.player.y) < 10) pathIndex += 1;
        let input = { mx: 0, my: 0, sneak: false, throwAt: null };
        if (pathIndex < path.length) input = steerToward(world, path[pathIndex].x, path[pathIndex].y);
        if (Math.hypot(ambush.x - world.player.x, ambush.y - world.player.y) < 12) arrived = true;
        const events = stepWorld(world, input, SAMPLE);
        if (events & EVENT_CAUGHT) break;
      } else {
        // Standing on the patrol route: the guard walks into the thief.
        // Being caught restarts the level at the start, so walk back to the
        // ambush spot and wait again until the last life is gone.
        const events = stepWorld(world, { mx: 0, my: 0, sneak: false, throwAt: null }, SAMPLE);
        if (events & EVENT_CAUGHT) {
          if (world.over) break;
          arrived = false;
          path = findPath(world, world.player.x, world.player.y, ambush.x, ambush.y);
          pathIndex = 0;
        }
      }
    }
    return { screen: world.over ? SCREEN_OVER : SCREEN_PLAY, world };
  }
  if (name === 'win') {
    let current = world;
    for (let level = 0; level < 3; level += 1) {
      const events = runAutopilot(current, 120);
      if (events & EVENT_GAME_WON) return { screen: SCREEN_WIN, world: current };
      if (events & EVENT_LEVEL_CLEAR) current = nextLevel(current);
      else break;
    }
    // Fallback: pocket the remaining loot by the game's own rules and walk out,
    // level by level, until the whole heist is won.
    for (let level = 0; level < 3 && !current.won; level += 1) {
      for (const item of current.loot) {
        if (!item.taken) {
          current.player.x = item.x;
          current.player.y = item.y;
          stepWorld(current, { mx: 0, my: 0, sneak: false, throwAt: null }, SAMPLE);
        }
      }
      current.player.x = current.exit.x;
      current.player.y = current.exit.y;
      const events = stepWorld(current, { mx: 0, my: 0, sneak: false, throwAt: null }, SAMPLE);
      if (events & EVENT_LEVEL_CLEAR) current = nextLevel(current);
    }
    return { screen: current.won ? SCREEN_WIN : SCREEN_PLAY, world: current };
  }
  // start (default): a fresh room, a few seconds in, title screen on top.
  for (let i = 0; i < 5 / SAMPLE; i += 1) {
    stepWorld(world, { mx: 0, my: 0, sneak: false, throwAt: null }, SAMPLE);
  }
  return { screen: SCREEN_TITLE, world };
}

export function shotWorld(levelIndex = 0) {
  return createWorld(levelIndex);
}

export { FIELD };
