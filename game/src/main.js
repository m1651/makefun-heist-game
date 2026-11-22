// The Midnight Vault: entry point. Owns the canvas, the game loop and the screens,
// and hands the simulation (world.js), drawing (render.js) and input (input.js)
// their jobs. ?shot=start|play|end|win renders a staged screenshot scene instead
// of the playable game, for the entry's screenshots.
import { FIELD, STEP } from './config.js';
import { createWorld, nextLevel, stepWorld, EVENT_CAUGHT, EVENT_COIN, EVENT_GAME_WON, EVENT_LEVEL_CLEAR, EVENT_PICKUP, EVENT_SPOTTED } from './world.js';
import { drawScreen, SCREEN_LEVEL_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createInput } from './input.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const TOTAL_HEIGHT = FIELD.height + 44; // play field plus the HUD bar

// Fixed internal resolution; fit the window while keeping the aspect ratio.
canvas.width = FIELD.width;
canvas.height = TOTAL_HEIGHT;
function fitCanvas() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / TOTAL_HEIGHT);
  canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.floor(TOTAL_HEIGHT * scale)}px`;
  canvas.style.left = `${Math.floor((window.innerWidth - FIELD.width * scale) / 2)}px`;
  canvas.style.top = `${Math.floor((window.innerHeight - TOTAL_HEIGHT * scale) / 2)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const input = createInput(canvas);
const sound = createSound();
let world = createWorld(0);
let screen = SCREEN_TITLE;
let time = 0;
let last = performance.now();
let accumulator = 0;

function announce(text) {
  statusEl.textContent = text;
}

/** A staged screenshot scene (?shot=...): render once and stop. */
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) {
  const staged = stageShot(shot, createWorld(0));
  drawScreen(ctx, staged.screen, staged.world, 0);
  announce(`Screenshot scene: ${shot}`);
} else {
  /** Advance one frame: fixed-step simulation, then draw. */
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;
    accumulator += dt;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      if (screen === SCREEN_PLAY) {
        const dir = input.direction();
        const events = stepWorld(world, {
          mx: dir.mx, my: dir.my, sneak: input.sneaking(), throwAt: input.takeClick(),
        });
        if (events & EVENT_PICKUP) { sound.pickup(); announce(`Loot pocketed: ${world.lootTaken} of ${world.loot.length}.`); }
        if (events & EVENT_COIN) sound.coin();
        if (events & EVENT_SPOTTED) { sound.spotted(); announce('Spotted! The alarm is rising — break line of sight!'); }
        if (events & EVENT_CAUGHT) {
          sound.caught();
          if (world.over) { screen = SCREEN_OVER; announce('Caught! The heist is over.'); }
          else announce(`Caught! A life lost — ${world.lives} left. The level restarts.`);
        }
        if (events & EVENT_LEVEL_CLEAR) { sound.clear(); screen = SCREEN_LEVEL_CLEAR; announce(`${world.def.name} cleared!`); }
        if (events & EVENT_GAME_WON) { sound.clear(); screen = SCREEN_WIN; announce('The perfect heist! All three rooms cleaned out.'); }
      }
    }
    if (screen === SCREEN_TITLE && input.takeConfirm()) {
      world = createWorld(0);
      screen = SCREEN_PLAY;
      // The click that started the game must not also throw a decoy coin on
      // the first frame of play: discard any click queued on a menu screen.
      input.takeClick();
      announce('The heist begins. Pocket every piece of loot, then reach the green exit.');
    } else if (screen === SCREEN_LEVEL_CLEAR && input.takeConfirm()) {
      world = nextLevel(world);
      screen = SCREEN_PLAY;
      input.takeClick();
      announce(`${world.def.name}. ${world.def.intro}`);
    } else if ((screen === SCREEN_OVER || screen === SCREEN_WIN) && input.takeConfirm()) {
      world = createWorld(0);
      screen = SCREEN_TITLE;
      announce('The Midnight Vault. Press Enter to start the heist.');
    }
    drawScreen(ctx, screen, world, time);
    requestAnimationFrame(frame);
  }
  announce('The Midnight Vault. Press Enter to start the heist.');
  requestAnimationFrame(frame);
}
