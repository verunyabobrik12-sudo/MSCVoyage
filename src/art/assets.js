// Слой процедурного пиксель-арта. Все спрайты рисуются прямоугольниками/фигурами
// прямо на канвасе — картинок-файлов нет. Публичный интерфейс (Assets.drawXxx)
// специально стабилен: когда появятся готовые PNG-атласы, реализацию внутри можно
// заменить на ctx.drawImage(...), не трогая сцены, которые вызывают эти функции.

import { PALETTE, shade } from './palette.js';

function outlineRect(ctx, x, y, w, h, fill, outline = PALETTE.ink) {
  ctx.fillStyle = outline;
  ctx.fillRect(Math.round(x - 1), Math.round(y - 1), w + 2, h + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function ellipseShadow(ctx, cx, cy, rx, ry) {
  ctx.save();
  ctx.fillStyle = PALETTE.uiShadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const CHARACTER_PALETTES = {
  girl: { skin: PALETTE.skinLight, hair: PALETTE.hairBrown, cloth: PALETTE.clothRed, clothDark: shade(PALETTE.clothRed, 0.25) },
  boy: { skin: PALETTE.skinMid, hair: PALETTE.hairBlack, cloth: PALETTE.clothBlue, clothDark: shade(PALETTE.clothBlue, 0.25) },
};

export const Assets = {
  /**
   * Персонаж 16×24 (условно), вид сверху под углом ¾. dir: 'up'|'down'|'left'|'right'.
   * animTime — секунды с начала анимации, moving — идёт ли герой сейчас.
   */
  drawPlayer(ctx, character, x, y, dir, animTime, moving) {
    const c = CHARACTER_PALETTES[character] || CHARACTER_PALETTES.girl;
    const walkPhase = moving ? Math.sin(animTime * 10) : Math.sin(animTime * 2) * 0.3;
    const legOffset = moving ? Math.round(walkPhase * 2) : 0;
    const bob = moving ? Math.abs(Math.round(walkPhase * 1)) : (Math.sin(animTime * 2) > 0 ? 0 : 0);

    const baseY = y - 20; // верх спрайта относительно "ног" в точке (x, y)

    ellipseShadow(ctx, x, y + 1, 7, 3);

    // Ноги
    outlineRect(ctx, x - 4, baseY + 16 - bob, 3, 5 + legOffset, PALETTE.clothNavy);
    outlineRect(ctx, x + 1, baseY + 16 - bob, 3, 5 - legOffset, PALETTE.clothNavy);

    // Туловище
    outlineRect(ctx, x - 5, baseY + 6 - bob, 10, 11, c.cloth);
    ctx.fillStyle = c.clothDark;
    ctx.fillRect(x - 5, baseY + 14 - bob, 10, 3);

    // Руки (по бокам туловища)
    const armSwing = moving ? Math.round(Math.sin(animTime * 10 + Math.PI) * 1.5) : 0;
    outlineRect(ctx, x - 7, baseY + 8 - bob + armSwing, 2, 6, c.skin);
    outlineRect(ctx, x + 5, baseY + 8 - bob - armSwing, 2, 6, c.skin);

    // Голова
    outlineRect(ctx, x - 4, baseY - 3 - bob, 8, 8, c.skin);

    // Волосы и лицо зависят от направления
    if (dir === 'up') {
      ctx.fillStyle = c.hair;
      ctx.fillRect(x - 4, baseY - 4 - bob, 8, 6);
    } else {
      ctx.fillStyle = c.hair;
      ctx.fillRect(x - 4, baseY - 4 - bob, 8, 3);
      // Глаза
      ctx.fillStyle = PALETTE.ink;
      if (dir === 'left') {
        ctx.fillRect(x - 3, baseY - bob, 1, 1);
      } else if (dir === 'right') {
        ctx.fillRect(x + 2, baseY - bob, 1, 1);
      } else {
        ctx.fillRect(x - 2, baseY - bob, 1, 1);
        ctx.fillRect(x + 1, baseY - bob, 1, 1);
      }
    }
  },

  /** Деревянный пол в тёплых тонах с доскообразным узором. */
  drawFloorWood(ctx, x, y, w, h) {
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = shade(PALETTE.woodMid, 0.2);
    ctx.lineWidth = 1;
    for (let py = y; py < y + h; py += 16) {
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();
    }
    for (let px = x; px < x + w; px += 32) {
      const offset = (Math.floor((px - x) / 32) % 2) * 16;
      for (let py = y + offset; py < y + h; py += 32) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + 16);
        ctx.stroke();
      }
    }
  },

  drawCarpet(ctx, x, y, w, h) {
    outlineRect(ctx, x, y, w, h, PALETTE.carpetRed);
    ctx.strokeStyle = PALETTE.carpetRedDark;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  },

  drawWall(ctx, x, y, w, h, color = PALETTE.wallCream) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = shade(color, 0.12);
    ctx.fillRect(x, y + h - 3, w, 3);
  },

  drawDoorFrame(ctx, x, y, w, h, label) {
    outlineRect(ctx, x, y, w, h, PALETTE.woodDark);
    ctx.fillStyle = shade(PALETTE.woodDark, -0.15);
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = PALETTE.accentGold;
    ctx.fillRect(x + w - 5, y + h / 2 - 1, 2, 2); // ручка
  },

  drawBed(ctx, x, y) {
    // Каркас
    outlineRect(ctx, x, y, 34, 48, PALETTE.woodDark);
    // Матрас/бельё
    outlineRect(ctx, x + 3, y + 3, 28, 42, PALETTE.clothWhite);
    // Подушка
    outlineRect(ctx, x + 6, y + 5, 22, 10, PALETTE.fabricBlue);
    // Одеяло
    ctx.fillStyle = PALETTE.fabricGold;
    ctx.fillRect(x + 3, y + 18, 28, 27);
    ctx.strokeStyle = shade(PALETTE.fabricGold, 0.2);
    ctx.strokeRect(x + 3, y + 18, 28, 27);
  },

  drawNightstand(ctx, x, y) {
    outlineRect(ctx, x, y, 16, 16, PALETTE.woodMid);
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 2, y + 6, 12, 1);
    // Лампа
    ctx.fillStyle = PALETTE.accentGold;
    ctx.fillRect(x + 6, y - 6, 4, 6);
    ctx.fillStyle = PALETTE.uiGold;
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 6);
    ctx.lineTo(x + 12, y - 6);
    ctx.lineTo(x + 10, y - 10);
    ctx.lineTo(x + 6, y - 10);
    ctx.closePath();
    ctx.fill();
  },

  drawDesk(ctx, x, y) {
    outlineRect(ctx, x, y, 28, 16, PALETTE.woodLight);
    ctx.fillStyle = shade(PALETTE.woodLight, 0.15);
    ctx.fillRect(x + 2, y + 12, 24, 2);
  },

  /** Буклет/брошюра MSC на столе — горячая точка викторины. */
  drawBrochure(ctx, x, y) {
    outlineRect(ctx, x, y, 10, 7, PALETTE.clothWhite);
    ctx.fillStyle = PALETTE.uiAccent;
    ctx.fillRect(x + 1, y + 1, 8, 2);
    ctx.fillStyle = PALETTE.accentGold;
    ctx.fillRect(x + 1, y + 4, 4, 2);
  },

  drawWardrobe(ctx, x, y) {
    outlineRect(ctx, x, y, 20, 40, PALETTE.woodDark);
    ctx.strokeStyle = shade(PALETTE.woodDark, 0.2);
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 10, y + 40);
    ctx.stroke();
    ctx.fillStyle = PALETTE.accentGold;
    ctx.fillRect(x + 8, y + 18, 1, 3);
    ctx.fillRect(x + 11, y + 18, 1, 3);
  },

  /** Круглый иллюминатор с анимированными волнами и небом. */
  drawPorthole(ctx, x, y, r, time) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = PALETTE.skyDay;
    ctx.fillRect(x - r, y - r, r * 2, r);
    ctx.fillStyle = PALETTE.seaMid;
    ctx.fillRect(x - r, y, r * 2, r);
    ctx.strokeStyle = PALETTE.seaFoam;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const wave = Math.sin(time * 2 + i * 1.3) * 2;
      ctx.beginPath();
      ctx.moveTo(x - r, y + 3 + i * 4 + wave);
      ctx.lineTo(x + r, y + 5 + i * 4 - wave);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.beginPath();
    ctx.arc(x, y, r + 1, 0, Math.PI * 2);
    ctx.stroke();
  },

  drawRug(ctx, x, y, w, h, color = PALETTE.fabricBlue) {
    outlineRect(ctx, x, y, w, h, color);
  },
};
