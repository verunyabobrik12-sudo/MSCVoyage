// Окна "Да/Нет" и инфо-облачко для иллюстрированных сцен — новый стиль
// (раздел 8). Появляются с pop-эффектом. Работают в ЭКРАННЫХ координатах
// канваса (полноразмерного, не логического) — так минимальный размер кнопки
// 44x44 CSS px гарантирован независимо от масштаба сцены.

import { drawPanel, drawRibbon, drawButton, measureWrapped, hitTest, popScale } from './components.js';
import { THEME } from './theme.js';

export class ConfirmDialog {
  constructor({ title, message, yesLabel = 'Да', noLabel = 'Нет' }) {
    this.title = title;
    this.message = message;
    this.yesLabel = yesLabel;
    this.noLabel = noLabel;
    this.elapsed = 0;
    this.yesRect = null;
    this.noRect = null;
  }

  update(dt) {
    this.elapsed += dt * 1000;
  }

  draw(ctx, canvasW, canvasH) {
    ctx.save();
    ctx.fillStyle = 'rgba(20,14,10,0.45)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const scale = popScale(this.elapsed);
    const w = Math.min(420, canvasW * 0.82);
    const lines = measureWrapped(ctx, this.message, w - 60, `600 18px ${THEME.fontFamily}`);
    const h = 96 + lines.length * 26;
    const cx = canvasW / 2;
    const cy = canvasH / 2;

    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);

    drawPanel(ctx, 0, 0, w, h);
    if (this.title) drawRibbon(ctx, w / 2 - 110, -14, 220, 36, this.title, 18);

    ctx.fillStyle = THEME.textDark;
    ctx.font = `600 18px ${THEME.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let ly = 46;
    for (const line of lines) {
      ctx.fillText(line, w / 2, ly);
      ly += 26;
    }

    const btnW = Math.max(96, (w - 60) / 2);
    const btnH = 48;
    const gap = 16;
    const totalW = btnW * 2 + gap;
    const bx = (w - totalW) / 2;
    const by = h - btnH - 18;
    const yesLocal = drawButton(ctx, bx, by, btnW, btnH, this.yesLabel, { accent: 'yes' });
    const noLocal = drawButton(ctx, bx + btnW + gap, by, btnW, btnH, this.noLabel, { accent: 'no' });

    // сохраняем хитбоксы в ЭКРАННЫХ координатах (учитывая translate/scale выше)
    this.yesRect = this._toScreenRect(yesLocal, cx, cy, scale, w, h);
    this.noRect = this._toScreenRect(noLocal, cx, cy, scale, w, h);

    ctx.restore();
  }

  _toScreenRect(local, cx, cy, scale, w, h) {
    const x = cx - (w / 2) * scale + local.x * scale;
    const y = cy - (h / 2) * scale + local.y * scale;
    return { x, y, w: local.w * scale, h: local.h * scale };
  }

  /** @returns {'yes'|'no'|null} */
  handleTap(point) {
    if (this.elapsed < 120) return null; // не ловить клик, которым диалог только что открыли
    if (hitTest(this.yesRect, point)) return 'yes';
    if (hitTest(this.noRect, point)) return 'no';
    return null;
  }
}

/** Информационное облачко с фактом — без кнопок, закрывается тапом или по таймеру. */
export class InfoBubble {
  constructor({ title, fact }, durationMs = 4000) {
    this.title = title;
    this.fact = fact;
    this.duration = durationMs;
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed += dt * 1000;
  }

  isExpired() {
    return this.elapsed >= this.duration;
  }

  draw(ctx, canvasW, canvasH) {
    const scale = popScale(this.elapsed);
    const fadeOut = this.elapsed > this.duration - 400 ? Math.max(0, (this.duration - this.elapsed) / 400) : 1;
    const w = Math.min(360, canvasW * 0.78);
    const lines = measureWrapped(ctx, this.fact, w - 56, `600 16px ${THEME.fontFamily}`);
    const h = 70 + lines.length * 22;
    const cx = canvasW / 2;
    const cy = canvasH * 0.28;

    ctx.save();
    ctx.globalAlpha = fadeOut;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);
    drawPanel(ctx, 0, 0, w, h, { radius: 18 });
    if (this.title) drawRibbon(ctx, w / 2 - 90, -14, 180, 32, this.title, 16);
    ctx.fillStyle = THEME.textDark;
    ctx.font = `600 16px ${THEME.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let ly = 42;
    for (const line of lines) {
      ctx.fillText(line, w / 2, ly);
      ly += 22;
    }
    ctx.restore();
  }
}
