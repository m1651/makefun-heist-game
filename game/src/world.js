// The simulation of The Midnight Vault: movement, guard patrols, vision cones,
// cameras, the alarm meter, loot, decoy coins and win/lose. No DOM here, so the
// same code drives the game, the staged screenshot scenes and local tests.
import { ALARM, CAMERA, COIN_BONUS, DECOY, GUARD, LOOT_VALUE, PLAYER, STEP, TILE, TIME_BONUS_PER_SECOND } from './config.js';
import { LEVELS, parseLevel } from './levels.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_LEVEL_CLEAR = 8;
export const EVENT_GAME_WON = 16;
export const EVENT_COIN = 32;

/** Build the live state for one level. */
export function createWorld(levelIndex) {
  const def = LEVELS[levelIndex];
  const { walls, crates, loot, start, exit } = parseLevel(def);
  const solids = [...walls, ...crates];
  const guards = def.guards.map((g) => ({
    waypoints: g.waypoints.map(([c, r]) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 })),
    waypointIndex: 0,
    x: g.waypoints[0][0] * TILE + TILE / 2,
    y: g.waypoints[0][1] * TILE + TILE / 2,
    angle: 0,
    state: 'patrol',
    investigate: null,
    pause: 0,
  }));
  const cameras = def.cameras.map((c) => ({
    x: c.tile[0] * TILE + TILE / 2,
    y: c.tile[1] * TILE + TILE / 2,
    baseAngle: c.angle,
    sweep: c.sweep,
    angle: c.angle,
    phase: 0,
  }));
  return {
    levelIndex,
    def,
    solids,
    walls,
    crates,
    loot,
    exit,
    player: { x: start.x, y: start.y, angle: 0, sneaking: false },
    start,
    guards,
    cameras,
    decoys: [],
    coinsLeft: DECOY.count,
    alarm: 0,
    lives: 3,
    score: 0,
    lootTaken: 0,
    levelTime: 0,
    spotted: false,
    over: false,
    won: false,
    levelClear: false,
  };
}

/** True when the circle at (x, y) with radius r overlaps any solid tile. */
function hitsSolid(world, x, y, r) {
  for (const s of world.solids) {
    const nx = Math.max(s.x, Math.min(x, s.x + s.w));
    const ny = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

/** Move a circle with axis separation so it slides along walls instead of sticking. */
function moveCircle(world, body, dx, dy, radius) {
  const nx = body.x + dx;
  if (!hitsSolid(world, nx, body.y, radius)) body.x = nx;
  const ny = body.y + dy;
  if (!hitsSolid(world, body.x, ny, radius)) body.y = ny;
}

/** True when no wall or crate stands between the two points (sampled along the line). */
export function hasLineOfSight(world, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (hitsSolid(world, x1 + dx * t, y1 + dy * t, 1)) return false;
  }
  return true;
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * True when the watcher at (wx, wy) facing `facing` can see the player:
 * inside the cone's range and half-angle, with a clear line of sight.
 * A sneaking thief is only spotted at a fraction of the cone's range.
 */
export function canSee(world, wx, wy, facing, range, halfAngle) {
  const p = world.player;
  const dx = p.x - wx;
  const dy = p.y - wy;
  const dist = Math.hypot(dx, dy);
  const limit = p.sneaking ? range * PLAYER.sneakDetectRange : range;
  if (dist > limit) return false;
  if (dist > 4 && Math.abs(angleDiff(Math.atan2(dy, dx), facing)) > halfAngle) return false;
  return hasLineOfSight(world, wx, wy, p.x, p.y);
}

/** Walk one guard toward its current target; returns true when it arrives. */
function walkGuard(world, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  if (!hitsSolid(world, nx, guard.y, GUARD.radius)) guard.x = nx;
  if (!hitsSolid(world, guard.x, ny, GUARD.radius)) guard.y = ny;
  guard.angle = angleTo(guard.x, guard.y, tx, ty);
  return false;
}

/** One guard's patrol / investigate behaviour for a step. */
function updateGuard(world, guard, dt) {
  if (guard.state === 'investigate' && guard.investigate) {
    const arrived = walkGuard(world, guard, guard.investigate.x, guard.investigate.y, GUARD.investigateSpeed, dt);
    if (arrived) {
      guard.pause = 1.2; // look around the coin's landing spot, then resume the patrol
      guard.state = 'patrol';
      guard.investigate = null;
    }
    return;
  }
  if (guard.pause > 0) {
    guard.pause -= dt;
    guard.angle += dt * 1.4; // scan the room while paused
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const arrived = walkGuard(world, guard, target.x, target.y, GUARD.patrolSpeed, dt);
  if (arrived) {
    guard.pause = 0.9;
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
  }
}

/** Throw a decoy coin from the player toward (tx, ty); guards nearby investigate it. */
export function throwDecoy(world, tx, ty) {
  if (world.coinsLeft <= 0 || world.over || world.levelClear) return false;
  world.coinsLeft -= 1;
  const dx = tx - world.player.x;
  const dy = ty - world.player.y;
  const dist = Math.hypot(dx, dy);
  const land = dist > 220 ? { x: world.player.x + (dx / dist) * 220, y: world.player.y + (dy / dist) * 220 } : { x: tx, y: ty };
  // A coin must land where a guard can actually stand on it: a coin thrown
  // into a wall or crate — or within a guard's radius of one — would lure a
  // guard to a spot it can never get within 4 px of, leaving it stuck
  // investigating forever. Walk the landing spot back toward the player until
  // a guard-sized circle around it is clear.
  if (dist > 0) {
    const ux = dx / dist;
    const uy = dy / dist;
    const clearance = GUARD.radius + 4;
    let back = 0;
    while (hitsSolid(world, land.x, land.y, clearance) && back < 220) {
      back += 10;
      land.x -= ux * 10;
      land.y -= uy * 10;
    }
    if (hitsSolid(world, land.x, land.y, clearance)) { land.x = world.player.x; land.y = world.player.y; }
  }
  world.decoys.push({ x: land.x, y: land.y, ttl: 6 });
  for (const guard of world.guards) {
    const d = Math.hypot(guard.x - land.x, guard.y - land.y);
    if (d < DECOY.lureRadius) {
      guard.state = 'investigate';
      guard.investigate = { x: land.x, y: land.y };
      guard.pause = 0;
    }
  }
  return true;
}

/**
 * Advance the world one fixed step.
 * `input` is { mx, my, sneak, throwAt } — movement direction, sneaking, a click target.
 * Returns a bitmask of EVENT_* flags for sounds and screen changes.
 */
export function stepWorld(world, input, dt = STEP) {
  if (world.over || world.levelClear) return EVENT_NONE;
  let events = EVENT_NONE;
  world.levelTime += dt;

  // The thief moves; sneaking is slower but keeps the alarm down.
  const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.speed;
  world.player.sneaking = input.sneak;
  const len = Math.hypot(input.mx, input.my);
  if (len > 0) {
    const nx = (input.mx / len) * speed * dt;
    const ny = (input.my / len) * speed * dt;
    moveCircle(world, world.player, nx, ny, PLAYER.radius);
    world.player.angle = Math.atan2(input.my, input.mx);
  }
  if (input.throwAt && throwDecoy(world, input.throwAt.x, input.throwAt.y)) events |= EVENT_COIN;

  // Guards patrol and cameras sweep.
  for (const guard of world.guards) updateGuard(world, guard, dt);
  for (const cam of world.cameras) {
    cam.phase += dt * CAMERA.sweepSpeed;
    cam.angle = cam.baseAngle + Math.sin(cam.phase) * cam.sweep;
  }
  for (const decoy of world.decoys) decoy.ttl -= dt;
  world.decoys = world.decoys.filter((d) => d.ttl > 0);

  // Detection: any guard or camera with the thief in its cone raises the alarm.
  // Cameras spot faster than guards, so a camera sighting fills the meter quicker.
  let seen = false;
  let seenByCamera = false;
  for (const guard of world.guards) {
    if (canSee(world, guard.x, guard.y, guard.angle, GUARD.coneRange, GUARD.coneHalfAngle)) { seen = true; break; }
  }
  if (!seen) {
    for (const cam of world.cameras) {
      if (canSee(world, cam.x, cam.y, cam.angle, CAMERA.coneRange, CAMERA.coneHalfAngle)) { seen = true; seenByCamera = true; break; }
    }
  }
  if (seen) {
    world.alarm = Math.min(ALARM.max, world.alarm + (seenByCamera ? CAMERA.alarmPerSecond : GUARD.alarmPerSecond) * dt);
    if (!world.spotted) { world.spotted = true; events |= EVENT_SPOTTED; }
  } else {
    world.spotted = false;
    world.alarm = Math.max(0, world.alarm - ALARM.drainPerSecond * dt);
  }

  // Caught: the alarm filled up. Lose a life and restart the level, or the game ends.
  if (world.alarm >= ALARM.caughtAt) {
    world.lives -= 1;
    world.alarm = 0;
    events |= EVENT_CAUGHT;
    if (world.lives <= 0) {
      world.over = true;
      return events;
    }
    const fresh = createWorld(world.levelIndex);
    fresh.score = world.score;
    fresh.lives = world.lives;
    Object.assign(world, fresh);
    return events;
  }

  // Loot: walk over a piece to pocket it.
  for (const item of world.loot) {
    if (!item.taken && Math.hypot(item.x - world.player.x, item.y - world.player.y) < 26) {
      item.taken = true;
      world.lootTaken += 1;
      world.score += LOOT_VALUE[item.kind];
      events |= EVENT_PICKUP;
    }
  }

  // Escape: with every piece pocketed, reach the green getaway door.
  const allLoot = world.loot.every((item) => item.taken);
  if (allLoot && Math.hypot(world.exit.x - world.player.x, world.exit.y - world.player.y) < 30) {
    const timeBonus = Math.max(0, Math.round((world.def.parSeconds - world.levelTime) * TIME_BONUS_PER_SECOND));
    world.score += timeBonus + world.coinsLeft * COIN_BONUS;
    world.levelClear = true;
    events |= world.levelIndex + 1 >= LEVELS.length ? EVENT_GAME_WON : EVENT_LEVEL_CLEAR;
    if (world.levelIndex + 1 >= LEVELS.length) world.won = true;
  }
  return events;
}

/** Start the next level, keeping score and lives. */
export function nextLevel(world) {
  const next = createWorld(world.levelIndex + 1);
  next.score = world.score;
  next.lives = world.lives;
  return next;
}
