// render.js — every pixel of The Gilded Fox: the museum floor, walls and
// cover, the guards' vision cones (ray-cast so walls cut them off), the
// sweeping cameras, the loot, the exit door, the thief, and the HUD with
// its alarm meter. One frame should tell the whole story at a glance.
import { TILE, COLS, ROWS, DETECT_RANGE, CAMERA_RANGE, CONE_HALF_ANGLE, ALARM_CAUGHT_AT, GHOST_BONUS } from './config.js';
import { tileAt } from './world.js';

const W = COLS * TILE;
const H = ROWS * TILE;

function conePolygon(ctx, def, x, y, angle, range) {
  const rays = 26;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= rays; i++) {
    const a = angle - CONE_HALF_ANGLE + (2 * CONE_HALF_ANGLE * i) / rays;
    let r = range;
    for (let d = 12; d < range; d += 12) {
      if (['#', 'C', 'P', 'V'].includes(tileAt(def, x + Math.cos(a) * d, y + Math.sin(a) * d))) { r = d; break; }
    }
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

function drawCone(ctx, def, x, y, angle, range, heat) {
  // heat 0 = calm yellow, 1 = fully alerted red.
  const r = Math.round(255);
  const g = Math.round(200 - 140 * heat);
  const b = Math.round(60 - 40 * heat);
  ctx.save();
  conePolygon(ctx, def, x, y, angle, range);
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${heat > 0.25 ? 0.38 : 0.22})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.55)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawTileFloor(ctx, def) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = def.map[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (ch === '#') {
        ctx.fillStyle = '#2b2f3a';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#3a4052';
        ctx.fillRect(px, py, TILE, 5);
        ctx.fillStyle = '#232733';
        ctx.fillRect(px, py + TILE - 4, TILE, 4);
        continue;
      }
      // Checkerboard marble floor, darker in the vault wing.
      const dark = (x + y) % 2 === 0;
      ctx.fillStyle = ch === 'V' ? '#1d2b33' : dark ? '#232838' : '#272d40';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      if (ch === 'V') {
        ctx.strokeStyle = '#3f6d7d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 6, py + TILE / 2);
        ctx.lineTo(px + TILE - 6, py + TILE / 2);
        ctx.moveTo(px + 6, py + TILE / 2 - 7);
        ctx.lineTo(px + TILE - 6, py + TILE / 2 - 7);
        ctx.moveTo(px + 6, py + TILE / 2 + 7);
        ctx.lineTo(px + TILE - 6, py + TILE / 2 + 7);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      if (ch === 'C') {
        ctx.fillStyle = '#6b4a2b';
        ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = '#8a6238';
        ctx.strokeRect(px + 4.5, py + 4.5, TILE - 9, TILE - 9);
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 4);
        ctx.lineTo(px + TILE - 4, py + TILE - 4);
        ctx.moveTo(px + TILE - 4, py + 4);
        ctx.lineTo(px + 4, py + TILE - 4);
        ctx.stroke();
      }
      if (ch === 'P') {
        ctx.fillStyle = '#2c4a2e';
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3f6b41';
        ctx.beginPath();
        ctx.arc(px + TILE / 2 - 6, py + TILE / 2 - 4, 8, 0, Math.PI * 2);
        ctx.arc(px + TILE / 2 + 7, py + TILE / 2 + 3, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawLoot(ctx, loot) {
  for (const item of loot) {
    if (item.taken) continue;
    const { x, y, kind } = item;
    const bob = Math.sin(Date.now() / 300 + x) * 2;
    ctx.save();
    ctx.translate(x, y + bob);
    if (kind === 'G') {
      ctx.fillStyle = '#f5c542';
      ctx.fillRect(-11, -6, 22, 12);
      ctx.fillStyle = '#ffe27a';
      ctx.fillRect(-11, -6, 22, 4);
      ctx.strokeStyle = '#a87f14';
      ctx.strokeRect(-11.5, -6.5, 23, 13);
    } else if (kind === 'D') {
      ctx.fillStyle = '#7fe7ff';
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 13);
      ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 13);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#7a4a21';
      ctx.fillRect(-13, -10, 26, 20);
      ctx.fillStyle = '#c98f4e';
      ctx.fillRect(-10, -7, 20, 14);
      ctx.fillStyle = '#e8b06a';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,220,120,0.5)';
    ctx.beginPath();
    ctx.arc(x, y + bob, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawExit(ctx, exit, open) {
  const { x, y } = exit;
  ctx.fillStyle = open ? '#1fae5f' : '#3d5a45';
  ctx.fillRect(x - 18, y - 18, 36, 36);
  ctx.strokeStyle = open ? '#7dffb0' : '#5c7a64';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 18, y - 18, 36, 36);
  ctx.lineWidth = 1;
  ctx.fillStyle = '#eafff1';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', x, y);
  if (open) {
    ctx.fillStyle = `rgba(125,255,176,${0.25 + 0.15 * Math.sin(Date.now() / 250)})`;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, player) {
  const { x, y } = player;
  ctx.save();
  ctx.translate(x, y);
  // Tail.
  ctx.strokeStyle = '#c96a1e';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.quadraticCurveTo(-14, 12, -18, 2);
  ctx.stroke();
  // Cloak body.
  ctx.fillStyle = player.sneaking ? '#1e4d5c' : '#274b63';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f2b36';
  ctx.beginPath();
  ctx.arc(0, 3, 9, 0, Math.PI);
  ctx.fill();
  // Fox ears.
  ctx.fillStyle = '#e07b24';
  ctx.beginPath();
  ctx.moveTo(-9, -8);
  ctx.lineTo(-5, -19);
  ctx.lineTo(-1, -9);
  ctx.closePath();
  ctx.moveTo(9, -8);
  ctx.lineTo(5, -19);
  ctx.lineTo(1, -9);
  ctx.closePath();
  ctx.fill();
  // Face.
  ctx.fillStyle = '#f4e6c8';
  ctx.beginPath();
  ctx.arc(0, -2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(-2.5, -3, 1.4, 0, Math.PI * 2);
  ctx.arc(2.5, -3, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (player.sneaking) {
    ctx.fillStyle = 'rgba(180,230,255,0.8)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', x, y - 24);
  }
}

function drawGuard(ctx, def, guard) {
  drawCone(ctx, def, guard.x, guard.y, guard.angle, DETECT_RANGE, guard.seen);
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.fillStyle = guard.state === 'chase' ? '#c0392b' : '#2c3e50';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = guard.state === 'chase' ? '#ff6b5e' : '#7f8c8d';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Cap and visor.
  ctx.fillStyle = '#1a252f';
  ctx.fillRect(-9, -12, 18, 6);
  ctx.fillStyle = '#f5d76e';
  ctx.fillRect(-7, -4, 14, 3);
  ctx.restore();
  if (guard.state === 'investigate') {
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - 22);
  }
  if (guard.state === 'chase') {
    ctx.fillStyle = '#ff5b4d';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 22);
  }
}

function drawCamera(ctx, def, cam) {
  drawCone(ctx, def, cam.x, cam.y, cam.angle, CAMERA_RANGE, cam.seen);
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.fillStyle = '#444';
  ctx.fillRect(-9, -9, 18, 18);
  ctx.fillStyle = cam.seen > 0.3 ? '#ff3b30' : '#e74c3c';
  ctx.beginPath();
  ctx.arc(Math.cos(cam.angle) * 10, Math.sin(cam.angle) * 10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCoins(ctx, coins) {
  for (const c of coins) {
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a87f14';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,217,77,0.6)';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 9 + Math.sin(Date.now() / 150) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, s) {
  ctx.fillStyle = 'rgba(10,12,20,0.88)';
  ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.levelName, 14, 22);
  // Alarm meter.
  const ax = 250;
  ctx.fillStyle = '#333';
  ctx.fillRect(ax, 12, 220, 20);
  const alarmFrac = s.alarm / ALARM_CAUGHT_AT;
  ctx.fillStyle = alarmFrac < 0.5 ? '#f5c542' : alarmFrac < 0.8 ? '#ff8c1a' : '#ff3b30';
  ctx.fillRect(ax, 12, 220 * Math.min(1, alarmFrac), 20);
  ctx.strokeStyle = '#888';
  ctx.strokeRect(ax + 0.5, 12.5, 220, 20);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('ALARM', ax + 6, 22);
  // Loot, lives, coins, score, time.
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText(`💰 ${s.lootTaken}/${s.lootTotal}`, 500, 22);
  ctx.fillStyle = '#ff6b81';
  ctx.fillText(`♥ ${'♥'.repeat(Math.max(0, s.lives))}`, 590, 22);
  ctx.fillStyle = '#9fd8ff';
  ctx.fillText(`◉ coins ${s.coins}`, 680, 22);
  ctx.fillStyle = '#e8e4d8';
  ctx.fillText(`Score ${s.score}`, 800, 22);
  ctx.fillText(`⏱ ${Math.floor(s.timeLeft)}s`, 920, 22);
  ctx.fillStyle = s.exitOpen ? '#7dffb0' : '#9aa3b2';
  ctx.fillText(s.exitOpen ? '→ EXIT OPEN' : '→ grab the loot', 1010, 22);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,10,18,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(title, W / 2, H / 2 - 70);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '19px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, H / 2 - 10 + i * 30));
}

export function render(ctx, s) {
  ctx.clearRect(0, 0, W, H);
  drawTileFloor(ctx, s.def);
  for (const cam of s.cameras) drawCamera(ctx, s.def, cam);
  drawLoot(ctx, s.loot);
  drawExit(ctx, s.exit, s.exitOpen);
  drawCoins(ctx, s.coinsInFlight);
  for (const guard of s.guards) drawGuard(ctx, s.def, guard);
  drawPlayer(ctx, s.player);
  // Caught flash.
  if (s.caughtFlash > 0) {
    ctx.fillStyle = `rgba(255,40,30,${Math.min(0.45, s.caughtFlash * 0.45)})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawHud(ctx, s);
  if (s.state === 'title') {
    overlay(ctx, 'THE GILDED FOX', [
      'A three-floor museum heist. Steal everything, wake nobody, vanish.',
      'WASD / arrows — move      Shift — sneak      E — toss a coin to distract',
      'Space — grab loot      P — pause      M — mute',
      'Guards and cameras raise the ALARM when they see you. Fill it and you are caught.',
      'Vents hide you. Crates and plants block their sight. The green door opens when the loot is gone.',
      'Press Enter to start the heist',
    ], '#f5c542');
  } else if (s.state === 'paused') {
    overlay(ctx, 'PAUSED', ['The museum waits. Press P to slip back into the dark.'], '#9fd8ff');
  } else if (s.state === 'levelClear') {
    overlay(ctx, 'CLEAN GETAWAY', [
      `${s.levelName} cleared — loot ${s.lootTaken}/${s.lootTotal}`,
      `Level score ${s.levelScore}   Total ${s.score}`,
      s.ghost ? `GHOST bonus: the alarm never passed half. +${GHOST_BONUS}` : '',
      'Press Enter for the next floor',
    ].filter(Boolean), '#7dffb0');
  } else if (s.state === 'win') {
    overlay(ctx, 'THE PERFECT HEIST', [
      `Every floor robbed. Final score ${s.score} in ${Math.floor(s.totalTime)}s.`,
      'The Gilded Fox was never even seen. The museum still does not know.',
      'Press R to run it back',
    ], '#f5c542');
  } else if (s.state === 'gameOver') {
    overlay(ctx, 'CAUGHT', [
      'The alarm screamed, the doors locked, and the Fox is in a cell.',
      `Score ${s.score} — the museum keeps its gold this time.`,
      'Press R to try again',
    ], '#ff5b4d');
  }
}
