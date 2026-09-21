// Переиспользуемые примитивы интерфейса: панели и кнопки в пиксельном стиле игры.
// "Immediate mode": рисуем и проверяем попадание тапа в одном месте вызова.

import { PALETTE, shade } from '../art/palette.js';
import { drawText, measureText } from '../art/font.js';

/** Круглая панель с рамкой — фон диалогов, HUD-плашек и карточек. */
export function drawPanel(ctx, x, y, w, h, { radius = 6, fill = PALETTE.uiPanel, border = PALETTE.uiBorder } = {}) {
  ctx.save();
  ctx.fillStyle = shade(border, -0.1);
  roundRectPath(ctx, x - 2, y - 2, w + 4, h + 4, radius + 1);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Кнопка с текстом. Возвращает свой хитбокс {x,y,w,h} — сохраните его и проверяйте
 * hitTest(rect, tapPoint) при обработке тапа/клика.
 */
export function drawButton(ctx, x, y, w, h, label, { active = true, accent = false } = {}) {
  const fill = !active ? PALETTE.uiPanelDark : accent ? PALETTE.uiGold : PALETTE.uiPanel;
  drawPanel(ctx, x, y, w, h, { fill, border: PALETTE.uiBorder, radius: 5 });
  const textScale = 1;
  const textW = measureText(label, textScale);
  drawText(ctx, label, x + (w - textW) / 2, y + (h - 7) / 2, {
    scale: textScale,
    color: active ? PALETTE.ink : PALETTE.inkSoft,
  });
  return { x, y, w, h };
}

export function hitTest(rect, point) {
  if (!rect || !point) return false;
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

/** Полупрозрачная заливка на весь экран — фон модальных окон. */
export function drawScrim(ctx, w, h, alpha = 0.5) {
  ctx.save();
  ctx.fillStyle = `rgba(20,14,10,${alpha})`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
