// Готовые диалоговые окна в стиле игры: табличка у двери и окно подтверждения.

import { PALETTE } from '../art/palette.js';
import { drawText, measureText, wrapText } from '../art/font.js';
import { drawPanel, drawButton, drawScrim, hitTest } from './ui.js';
import { STRINGS } from '../data/strings.ru.js';

/** Пиксельная табличка над дверью: "Пойти: Ресторан?" + Да/Нет. */
export class DoorSign {
  constructor(label, anchorX, anchorY) {
    this.label = STRINGS.doors.goTo(label);
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.yesRect = null;
    this.noRect = null;
  }

  draw(ctx) {
    const textW = measureText(this.label, 1);
    const w = Math.max(textW + 16, 90);
    const h = 42;
    const x = Math.round(this.anchorX - w / 2);
    const y = Math.round(this.anchorY);

    drawPanel(ctx, x, y, w, h);
    drawText(ctx, this.label, x + (w - textW) / 2, y + 6, { scale: 1, color: PALETTE.ink });

    const btnW = 34;
    const btnH = 16;
    const gap = 6;
    const totalW = btnW * 2 + gap;
    const startX = x + (w - totalW) / 2;
    this.yesRect = drawButton(ctx, startX, y + h - btnH - 6, btnW, btnH, STRINGS.doors.yes, { accent: true });
    this.noRect = drawButton(ctx, startX + btnW + gap, y + h - btnH - 6, btnW, btnH, STRINGS.doors.no);
  }

  /** @returns {'yes'|'no'|null} */
  handleTap(point) {
    if (hitTest(this.yesRect, point)) return 'yes';
    if (hitTest(this.noRect, point)) return 'no';
    return null;
  }
}

/** Универсальное окно подтверждения: заголовок/текст + две кнопки. */
export class ConfirmDialog {
  constructor({ title = '', message, confirmLabel, cancelLabel, screenW, screenH }) {
    this.title = title;
    this.message = message;
    this.confirmLabel = confirmLabel;
    this.cancelLabel = cancelLabel;
    this.screenW = screenW;
    this.screenH = screenH;
    this.confirmRect = null;
    this.cancelRect = null;
  }

  draw(ctx) {
    drawScrim(ctx, this.screenW, this.screenH);

    const lines = wrapText(this.message, 26);
    const w = 180;
    const lineH = 10;
    const h = 70 + lines.length * lineH + (this.title ? 12 : 0);
    const x = Math.round((this.screenW - w) / 2);
    const y = Math.round((this.screenH - h) / 2);

    drawPanel(ctx, x, y, w, h);
    let cursorY = y + 10;
    if (this.title) {
      const titleW = measureText(this.title, 1);
      drawText(ctx, this.title, x + (w - titleW) / 2, cursorY, { scale: 1, color: PALETTE.ink });
      cursorY += 14;
    }
    for (const line of lines) {
      const lineW = measureText(line, 1);
      drawText(ctx, line, x + (w - lineW) / 2, cursorY, { scale: 1, color: PALETTE.inkSoft });
      cursorY += lineH;
    }

    const btnW = 76;
    const btnH = 20;
    const gap = 8;
    const totalW = btnW * 2 + gap;
    const startX = x + (w - totalW) / 2;
    const btnY = y + h - btnH - 10;
    this.confirmRect = drawButton(ctx, startX, btnY, btnW, btnH, this.confirmLabel);
    this.cancelRect = drawButton(ctx, startX + btnW + gap, btnY, btnW, btnH, this.cancelLabel, { accent: true });
  }

  /** @returns {'confirm'|'cancel'|null} */
  handleTap(point) {
    if (hitTest(this.confirmRect, point)) return 'confirm';
    if (hitTest(this.cancelRect, point)) return 'cancel';
    return null;
  }
}

/** Стандартный диалог выхода из викторины/мини-игры без начисления баллов. */
export function createExitConfirmDialog(screenW, screenH) {
  return new ConfirmDialog({
    message: 'Баллы за неё не будут начислены',
    title: 'Выйти?',
    confirmLabel: STRINGS.common.continue,
    cancelLabel: STRINGS.common.exit,
    screenW,
    screenH,
  });
}
