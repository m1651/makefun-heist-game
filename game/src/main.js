// main.js — The Gilded Fox: game loop, states, alarm, loot, coins and the
// autopilot that plays the game by itself for testing. Three floors:
// steal everything, reach the green door, never fill the alarm meter.
import { TILE, LEVELS, PLAYER_SPEED, SNEAK_SPEED, ALARM_PER_SECOND, ALARM_DECAY_PER_SECOND, ALARM_CAUGHT_AT, ALARM_AFTER_CAUGHT, START_LIVES, START_COINS, LOOT_SCORES, GHOST_BONUS, TIME_BONUS_PER_SECOND } from './config.js';
import { parseLevel, moveWithCollision, findPath } from './world.js';
import { Guard, Camera } from './guards.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();
const params = new URLSearchParams(location.search);
const AUTOPILOT = params.get('autopilot') === '1';
const SHOT = params.get('shot');

const LEVEL_TIME = 240;

class Game {
  constructor() {
    this.state = 'title'; // title | playing | paused | levelClear | win | gameOver
    this.levelIndex = 0;
    this.score = 0;
    this.lives = START_LIVES;
    this.totalTime = 0;
    this.auto = { path: null, target: null, repathAt: 0 };
    this.loadLevel(0);
    this.timeLeft = LEVEL_TIME;
    this.caughtFlash = 0;
    this.alarmSoundAt = 0;
  }

  loadLevel(i) {
    this.levelIndex = i;
    this.def = LEVELS[i];
    const parsed = parseLevel(this.def);
    this.loot = parsed.loot;
    this.exit = parsed.exit;
    this.player = { x: parsed.start.x, y: parsed.start.y, sneaking: false, facing: 0 };
    this.guards = this.def.guards.map((g) => new Guard(g));
    this.cameras = this.def.cameras.map((c) => new Camera(c));
    this.alarm = 0;
    this.coins = START_COINS;
    this.coinsInFlight = [];
    this.timeLeft = LEVEL_TIME;
    this.levelScore = 0;
    this.peakAlarm = 0;
    this.auto.path = null;
    this.auto.target = null;
  }

  get lootTaken() { return this.loot.filter((l) => l.taken).length; }
  get lootTotal() { return this.loot.length; }
  get exitOpen() { return this.lootTaken === this.lootTotal; }
  get ghost() { return this.peakAlarm <= 50; }

  start() {
    this.score = 0;
    this.lives = START_LIVES;
    this.totalTime = 0;
    this.loadLevel(0);
    this.state = 'playing';
    audio.unlock();
    audio.click();
  }

  nextLevel() {
    this.levelScore += Math.floor(this.timeLeft) * TIME_BONUS_PER_SECOND;
    if (this.ghost) this.levelScore += GHOST_BONUS;
    this.score += this.levelScore;
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.state = 'win';
      audio.win();
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.state = 'playing';
    audio.door();
  }

  caught() {
    this.lives -= 1;
    this.caughtFlash = 1;
    audio.caught();
    if (this.lives <= 0) {
      this.state = 'gameOver';
      return;
    }
    // The Fox slips back to the entrance, shaken but free.
    const parsed = parseLevel(this.def);
    this.player.x = parsed.start.x;
    this.player.y = parsed.start.y;
    this.alarm = ALARM_AFTER_CAUGHT;
    this.guards = this.def.guards.map((g) => new Guard(g));
    this.coinsInFlight = [];
    this.auto.path = null;
  }

  grabLoot() {
    for (const item of this.loot) {
      if (item.taken) continue;
      if (Math.hypot(item.x - this.player.x, item.y - this.player.y) < 34) {
        item.taken = true;
        const pts = LOOT_SCORES[item.kind];
        this.score += pts;
        this.levelScore += pts;
        audio.loot();
        if (this.exitOpen) audio.door();
        return;
      }
    }
  }

  tossCoin() {
    if (this.coins <= 0) return;
    this.coins -= 1;
    const tx = this.player.x + Math.cos(this.player.facing) * 130;
    const ty = this.player.y + Math.sin(this.player.facing) * 130;
    const cx = Math.max(TILE, Math.min(TILE * 31, tx));
    const cy = Math.max(TILE, Math.min(TILE * 17, ty));
    this.coinsInFlight.push({ x: cx, y: cy, ttl: 5 });
    for (const g of this.guards) g.hearCoin(cx, cy);
    audio.coin();
  }

  reachExit() {
    if (!this.exitOpen) return false;
    return Math.hypot(this.exit.x - this.player.x, this.exit.y - this.player.y) < 30;
  }

  update(dt) {
    if (this.state === 'levelClear' && AUTOPILOT) {
      this.levelClearAt = (this.levelClearAt || 0) + dt;
      if (this.levelClearAt > 1) {
        this.levelClearAt = 0;
        this.nextLevel();
      }
      return;
    }
    if (this.state !== 'playing') return;
    this.totalTime += dt;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.caught(); return; }
    this.caughtFlash = Math.max(0, this.caughtFlash - dt * 1.4);

    // Movement.
    const mv = input.moveVector();
    this.player.sneaking = input.sneaking();
    const speed = this.player.sneaking ? SNEAK_SPEED : PLAYER_SPEED;
    if (mv.x !== 0 || mv.y !== 0) {
      this.player.facing = Math.atan2(mv.y, mv.x);
      moveWithCollision(this.def, this.player, mv.x * speed * dt, mv.y * speed * dt, 13);
    }
    if (AUTOPILOT) this.autopilot(dt);

    // Guards and cameras watch.
    let seen = 0;
    for (const g of this.guards) seen = Math.max(seen, g.update(dt, this.player, this.def));
    for (const c of this.cameras) seen = Math.max(seen, c.update(dt, this.player, this.def));
    if (seen > 0) {
      this.alarm += seen * dt;
      this.peakAlarm = Math.max(this.peakAlarm, this.alarm);
      if (this.alarm > 70 && this.totalTime - this.alarmSoundAt > 1.2) {
        this.alarmSoundAt = this.totalTime;
        audio.alarm();
      }
    } else {
      this.alarm = Math.max(0, this.alarm - ALARM_DECAY_PER_SECOND * dt);
    }
    if (this.alarm >= ALARM_CAUGHT_AT) { this.caught(); return; }

    // Coins fade.
    for (const c of this.coinsInFlight) c.ttl -= dt;
    this.coinsInFlight = this.coinsInFlight.filter((c) => c.ttl > 0);

    // Actions.
    if (input.wasPressed(' ') || input.wasPressed('Space')) this.grabLoot();
    if (input.wasPressed('e')) this.tossCoin();
    if (input.mouse.clicked) {
      this.player.facing = Math.atan2(input.mouse.y - this.player.y, input.mouse.x - this.player.x);
      this.tossCoin();
    }
    if (this.reachExit()) {
      this.state = 'levelClear';
      audio.win();
    }
  }

  // Autopilot: breadth-first-search to the nearest loot, then to the exit,
  // sneaking whenever a guard or camera cone is close.
  autopilot(dt) {
    const now = performance.now();
    const target = this.exitOpen ? this.exit : this.loot.find((l) => !l.taken);
    if (!target) return;
    const nearDanger = this.guards.some((g) => Math.hypot(g.x - this.player.x, g.y - this.player.y) < 220) ||
      this.cameras.some((c) => Math.hypot(c.x - this.player.x, c.y - this.player.y) < 260);
    if (!this.auto.path || !this.auto.target || this.auto.target !== target || now > this.auto.repathAt) {
      this.auto.path = findPath(this.def, this.player.x, this.player.y, target.x, target.y);
      this.auto.target = target;
      this.auto.repathAt = now + 1500;
    }
    if (!this.auto.path || this.auto.path.length === 0) return;
    const next = this.auto.path[0];
    if (Math.hypot(next.x - this.player.x, next.y - this.player.y) < 10) {
      this.auto.path.shift();
      return;
    }
    const dx = next.x - this.player.x;
    const dy = next.y - this.player.y;
    const dist = Math.hypot(dx, dy);
    const speed = nearDanger ? SNEAK_SPEED : PLAYER_SPEED;
    this.player.sneaking = nearDanger;
    this.player.facing = Math.atan2(dy, dx);
    moveWithCollision(this.def, this.player, (dx / dist) * speed * dt, (dy / dist) * speed * dt, 13);
    if (!this.exitOpen && Math.hypot(target.x - this.player.x, target.y - this.player.y) < 34) this.grabLoot();
  }

  handleKeys() {
    if (input.wasPressed('Enter')) {
      if (this.state === 'title') this.start();
      else if (this.state === 'levelClear') this.nextLevel();
    }
    if (input.wasPressed('r') || input.wasPressed('R')) {
      if (this.state === 'win' || this.state === 'gameOver') this.start();
    }
    if (input.wasPressed('p') || input.wasPressed('P')) {
      if (this.state === 'playing') { this.state = 'paused'; audio.click(); }
      else if (this.state === 'paused') { this.state = 'playing'; audio.click(); }
    }
    if (input.wasPressed('m') || input.wasPressed('M')) audio.toggleMute();
  }

  view() {
    return {
      def: this.def,
      state: this.state,
      levelName: this.def.name,
      player: this.player,
      guards: this.guards,
      cameras: this.cameras,
      loot: this.loot,
      exit: this.exit,
      exitOpen: this.exitOpen,
      lootTaken: this.lootTaken,
      lootTotal: this.lootTotal,
      alarm: this.alarm,
      lives: this.lives,
      coins: this.coins,
      coinsInFlight: this.coinsInFlight,
      score: this.score,
      levelScore: this.levelScore,
      timeLeft: this.timeLeft,
      totalTime: this.totalTime,
      ghost: this.ghost,
      caughtFlash: this.caughtFlash,
    };
  }
}

const game = new Game();

// Screenshot presets: ?shot=start shows the title over the live museum,
// ?shot=play drops the Fox mid-floor with cones sweeping, ?shot=alarm
// catches the alarm nearly full with a guard chasing, ?shot=win shows the
// perfect-heist screen. All of them run the real game code.
function applyShot() {
  if (!SHOT) return;
  if (SHOT === 'start') { game.state = 'title'; return; }
  if (SHOT === 'win') {
    game.state = 'win';
    game.score = 2840;
    game.totalTime = 312;
    return;
  }
  game.state = 'playing';
  game.player.x = 15.5 * TILE;
  game.player.y = 9.5 * TILE;
  game.player.facing = Math.PI;
  game.loot[0].taken = true;
  if (SHOT === 'alarm') {
    game.alarm = 82;
    game.peakAlarm = 82;
    game.guards[0].state = 'chase';
    game.guards[0].x = game.player.x - 150;
    game.guards[0].y = game.player.y - 40;
    game.guards[0].angle = 0;
  }
  if (SHOT === 'play') {
    game.guards[0].x = game.player.x + 190;
    game.guards[0].y = game.player.y - 90;
    game.guards[0].angle = Math.PI * 0.85;
  }
}
applyShot();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.handleKeys();
  game.update(dt);
  render(ctx, game.view());
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose a tiny handle for headless playtests.
window.__fox = { game, AUTOPILOT };
