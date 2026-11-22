// guards.js — patrolling guards and sweeping security cameras.
// A guard walks its waypoints, pauses, and turns its vision cone toward
// whatever it is looking at. A thrown coin makes nearby guards investigate
// the landing spot. Cameras sweep back and forth on their mounts.
import { TILE, GUARD_SPEED, GUARD_ALERT_SPEED, DETECT_RANGE, CAMERA_RANGE, CONE_HALF_ANGLE, ALARM_PER_SECOND, CAMERA_ALARM_PER_SECOND, SNEAK_DETECT } from './config.js';
import { hasLineOfSight, inVent } from './world.js';

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// How strongly does this watcher see the player right now?
// 0 = not seen; 1 = seen at point blank. Sneaking and distance soften it.
export function sightStrength(def, watcher, player, range, alarmRate) {
  if (inVent(def, player.x, player.y)) return 0;
  const dx = player.x - watcher.x;
  const dy = player.y - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  const ang = angleTo(watcher.x, watcher.y, player.x, player.y);
  if (Math.abs(angleDiff(ang, watcher.angle)) > CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(def, watcher.x, watcher.y, player.x, player.y)) return 0;
  const closeness = 1 - dist / range;
  const sneak = player.sneaking ? SNEAK_DETECT : 1;
  return (0.35 + 0.65 * closeness) * sneak * alarmRate;
}

export class Guard {
  constructor(def) {
    this.x = (def.spawn[0] + 0.5) * TILE;
    this.y = (def.spawn[1] + 0.5) * TILE;
    this.waypoints = def.waypoints.map(([x, y]) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }));
    this.wpIndex = 1 % this.waypoints.length;
    this.pause = def.pause ?? 1;
    this.pauseLeft = 0;
    this.angle = -Math.PI / 2;
    this.state = 'patrol'; // patrol | investigate | chase
    this.investigate = null;
    this.stateTime = 0;
    this.seen = 0; // 0..1, how alerted this guard looks
  }

  update(dt, player, def) {
    this.stateTime += dt;
    const strength = sightStrength(def, this, player, DETECT_RANGE, ALARM_PER_SECOND);
    this.seen = Math.min(1, Math.max(0, this.seen + (strength > 0 ? dt * 1.6 : -dt * 0.5)));
    if (strength > 0 && this.state !== 'chase') {
      this.state = 'chase';
      this.stateTime = 0;
    }
    if (this.state === 'chase') {
      this.moveToward(player.x, player.y, GUARD_ALERT_SPEED * dt, def);
      this.angle = angleTo(this.x, this.y, player.x, player.y);
      if (strength === 0 && this.stateTime > 3.5) {
        this.state = 'patrol';
        this.stateTime = 0;
      }
      return strength;
    }
    if (this.state === 'investigate' && this.investigate) {
      const arrived = this.moveToward(this.investigate.x, this.investigate.y, GUARD_SPEED * 1.25 * dt, def);
      this.angle = angleTo(this.x, this.y, this.investigate.x, this.investigate.y);
      if (arrived || this.stateTime > 6) {
        this.state = 'patrol';
        this.investigate = null;
        this.stateTime = 0;
      }
      return strength;
    }
    // Patrol: walk to the next waypoint, pause, turn to the next one.
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dt;
      const next = this.waypoints[this.wpIndex];
      const target = angleTo(this.x, this.y, next.x, next.y);
      this.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, angleDiff(target, this.angle)));
      return strength;
    }
    const target = this.waypoints[this.wpIndex];
    const arrived = this.moveToward(target.x, target.y, GUARD_SPEED * dt, def);
    this.angle = angleTo(this.x, this.y, target.x, target.y);
    if (arrived) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.pauseLeft = this.pause;
    }
    return strength;
  }

  moveToward(tx, ty, step, def) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const nx = this.x + (dx / dist) * Math.min(step, dist);
    const ny = this.y + (dy / dist) * Math.min(step, dist);
    // Guards walk the floor: never step into a solid tile.
    if (!solidAt(def, nx, this.y)) this.x = nx;
    if (!solidAt(def, this.x, ny)) this.y = ny;
    return Math.hypot(tx - this.x, ty - this.y) < 4;
  }

  hearCoin(x, y) {
    const dist = Math.hypot(x - this.x, y - this.y);
    if (dist < 340 && this.state !== 'chase') {
      this.state = 'investigate';
      this.investigate = { x, y };
      this.stateTime = 0;
    }
  }

  reset(def) {
    const fresh = new Guard(def);
    Object.assign(this, fresh);
  }
}

function solidAt(def, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= def.map[0].length || ty >= def.map.length) return true;
  return ['#', 'C', 'P'].includes(def.map[ty][tx]);
}

export class Camera {
  constructor(def) {
    this.x = (def.at[0] + 0.5) * TILE;
    this.y = (def.at[1] + 0.5) * TILE;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep;
    this.speed = def.speed;
    this.time = Math.random() * 10;
    this.angle = def.baseAngle;
    this.seen = 0;
  }

  update(dt, player, def) {
    this.time += dt;
    this.angle = this.baseAngle + Math.sin(this.time * this.speed) * this.sweep;
    const strength = sightStrength(def, this, player, CAMERA_RANGE, CAMERA_ALARM_PER_SECOND);
    this.seen = Math.min(1, Math.max(0, this.seen + (strength > 0 ? dt * 2 : -dt * 0.6)));
    return strength;
  }
}
