// All drawing for The Midnight Vault: the room, vision cones, cameras, loot,
// the thief and the guards, the HUD and every screen. Canvas 2D only, no assets.
import { ALARM, CAMERA, FIELD, GUARD, TILE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVEL_CLEAR = 'level-clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const LOOT_DRAW = {
  diamond: { color: '#5ff2ff', label: '◆' },
  gold: { color: '#ffd34d', label: '$' },
  art: { color: '#ff9de2', label: '▣' },
};

/** Draw one vision cone: a translucent wedge from (x, y) facing `angle`. */
function drawCone(ctx, x, y, angle, range, halfAngle, color) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Draw the floor tiles, walls and crates of the room. */
function drawRoom(ctx, world) {
  ctx.fillStyle = '#171a2b';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.strokeStyle = '#20243a';
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD.width; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.height); ctx.stroke();
  }
  for (let y = 0; y <= FIELD.height; y += TILE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
  }
  for (const w of world.walls) {
    ctx.fillStyle = '#2c3152';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#3a4066';
    ctx.fillRect(w.x, w.y, w.w, 5);
  }
  for (const c of world.crates) {
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
    ctx.strokeStyle = '#8a6136';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
    ctx.beginPath();
    ctx.moveTo(c.x + 2, c.y + 2); ctx.lineTo(c.x + c.w - 2, c.y + c.h - 2);
    ctx.moveTo(c.x + c.w - 2, c.y + 2); ctx.lineTo(c.x + 2, c.y + c.h - 2);
    ctx.stroke();
  }
}

/** Draw the loot still on the floor, glowing so it reads at a glance. */
function drawLoot(ctx, world, time) {
  const pulse = 0.55 + 0.35 * Math.sin(time * 4);
  for (const item of world.loot) {
    if (item.taken) continue;
    const draw = LOOT_DRAW[item.kind];
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = draw.color;
    ctx.beginPath();
    ctx.arc(item.x, item.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#0b0e1a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(draw.label, item.x, item.y + 1);
  }
}

/** Draw the green getaway door and its label. */
function drawExit(ctx, world) {
  const allLoot = world.loot.every((item) => item.taken);
  ctx.save();
  ctx.fillStyle = allLoot ? '#2ecc71' : '#1e7a46';
  ctx.fillRect(world.exit.x - 18, world.exit.y - 18, 36, 36);
  ctx.strokeStyle = allLoot ? '#a9f5c8' : '#2ecc71';
  ctx.lineWidth = 2;
  ctx.strokeRect(world.exit.x - 18, world.exit.y - 18, 36, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', world.exit.x, world.exit.y - 26);
  ctx.restore();
}

/** Draw the thief: a hooded figure with a facing tick. */
function drawPlayer(ctx, world) {
  const p = world.player;
  ctx.save();
  ctx.fillStyle = p.sneaking ? '#7a5cff' : '#b78cff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0e1a';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.angle) * 6, p.y + Math.sin(p.angle) * 6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e9d5ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Draw a guard: navy body, facing tick, and its yellow vision cone. */
function drawGuard(ctx, guard, world, time) {
  const alert = world.spotted;
  drawCone(ctx, guard.x, guard.y, guard.angle, GUARD.coneRange, GUARD.coneHalfAngle,
    alert ? 'rgba(255,80,60,0.30)' : 'rgba(255,214,64,0.22)');
  ctx.save();
  ctx.fillStyle = '#3d6bff';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dbeafe';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.angle) * 6, guard.y + Math.sin(guard.angle) * 6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
  ctx.stroke();
  if (guard.state === 'investigate') {
    ctx.fillStyle = '#ffd64d';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - 22);
  }
  ctx.restore();
}

/** Draw a wall camera: a red sweeping cone and a small mount. */
function drawCamera(ctx, cam, world) {
  drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.coneRange, CAMERA.coneHalfAngle,
    world.spotted ? 'rgba(255,60,60,0.35)' : 'rgba(255,60,60,0.20)');
  ctx.save();
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath();
  ctx.arc(cam.x, cam.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cam.x, cam.y, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The HUD bar: loot, alarm meter, lives, coins, level and score. */
function drawHud(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,7,16,0.88)';
  ctx.fillRect(0, 0, FIELD.width, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LOOT ${world.lootTaken}/${world.loot.length}`, 14, 23);
  ctx.fillText(`SCORE ${world.score}`, 150, 23);
  ctx.fillText(`LEVEL ${world.levelIndex + 1} — ${world.def.name}`, 300, 23);
  // Alarm meter: green when calm, red when hot, labelled so it reads at a glance.
  ctx.fillText('ALARM', 560, 23);
  ctx.fillStyle = '#22263d';
  ctx.fillRect(625, 13, 150, 18);
  const frac = world.alarm / ALARM.max;
  ctx.fillStyle = frac < 0.5 ? '#2ecc71' : frac < 0.8 ? '#f5a623' : '#ff4d4d';
  ctx.fillRect(625, 13, 150 * frac, 18);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(625, 13, 150, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('♥'.repeat(Math.max(0, world.lives)), 800, 23);
  ctx.fillText(`COINS ${world.coinsLeft}`, 870, 23);
  ctx.restore();
}

/** A dim overlay panel with centred title and lines, for title / end screens. */
function drawPanel(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,7,16,0.82)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, FIELD.width / 2, 170);
  ctx.fillStyle = '#e8eaf6';
  ctx.font = '18px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 240 + i * 34));
  ctx.restore();
}

/** Draw the whole play field: room, cones, loot, actors and HUD. */
export function drawWorld(ctx, world, time) {
  ctx.save();
  ctx.translate(0, 44); // the HUD bar occupies the top 44 px
  drawRoom(ctx, world);
  drawExit(ctx, world);
  drawLoot(ctx, world, time);
  for (const cam of world.cameras) drawCamera(ctx, cam, world);
  for (const guard of world.guards) drawGuard(ctx, guard, world, time);
  for (const decoy of world.decoys) {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(decoy.x, decoy.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  drawPlayer(ctx, world);
  ctx.restore();
  drawHud(ctx, world);
}

/** Draw one screen over the world. */
export function drawScreen(ctx, screen, world, time) {
  if (screen === SCREEN_PLAY) {
    drawWorld(ctx, world, time);
    return;
  }
  drawWorld(ctx, world, time);
  if (screen === SCREEN_TITLE) {
    drawPanel(ctx, 'THE MIDNIGHT VAULT', [
      'A stealth heist in three rooms. Pocket every piece of loot, then slip out the green EXIT door.',
      'Move: WASD or arrow keys    Sneak (slow, hard to see): hold Shift',
      'Throw a decoy coin (click): lures nearby guards away — 3 per level',
      'Guards and cameras raise the ALARM when you cross their cones. At 100% you are caught.',
      'Crates and walls block sight. Plan your route before you move.',
      '',
      'Click or press Enter to start the heist.',
    ], '#ffd34d');
  } else if (screen === SCREEN_LEVEL_CLEAR) {
    drawPanel(ctx, 'CLEAN GETAWAY!', [
      `${world.def.name} cleared. Loot ${world.lootTaken}/${world.loot.length} — score ${world.score}.`,
      'Press Enter for the next room.',
    ], '#2ecc71');
  } else if (screen === SCREEN_OVER) {
    drawPanel(ctx, 'CAUGHT!', [
      'The alarm hit 100% and the guards closed in.',
      `You pocketed ${world.lootTaken} piece(s) of loot and scored ${world.score} points.`,
      'Press Enter to try the heist again.',
    ], '#ff4d4d');
  } else if (screen === SCREEN_WIN) {
    drawPanel(ctx, 'THE PERFECT HEIST!', [
      'All three rooms cleaned out. The vault is empty and you are gone.',
      `Final score: ${world.score} points.`,
      'Press Enter to play again.',
    ], '#5ff2ff');
  }
}
