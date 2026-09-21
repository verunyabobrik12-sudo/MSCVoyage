// Переиспользуемые UI-примитивы нового интерфейса: кремовые панели, объёмные
// кнопки, перенос текста по словам (по факту измеренной ширины — уже не
// пиксельный шрифт фиксированной ширины). "Immediate mode": рисуем и
// возвращаем хитбокс в одном вызове, как и раньше в ui.js.

import { THEME } from './theme.js';

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawPanel(ctx, x, y, w, h, { radius = 22 } = {}) {
  ctx.save();
  // тёмно-коричневая обводка
  roundRectPath(ctx, x - 4, y - 4, w + 8, h + 8, radius + 4);
  ctx.fillStyle = THEME.panelBorder;
  ctx.fill();

  // кремовый градиент
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, THEME.panelFillTop);
  grad.addColorStop(1, THEME.panelFillBottom);
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = grad;
  ctx.fill();

  // золотисто-деревянная внутренняя кайма
  roundRectPath(ctx, x + 6, y + 6, w - 12, h - 12, Math.max(4, radius - 8));
  ctx.lineWidth = 2;
  ctx.strokeStyle = THEME.panelInnerTrim;
  ctx.stroke();
  ctx.restore();
  return { x, y, w, h };
}

export function drawRibbon(ctx, x, y, w, h, text, fontSize = 20) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 10);
  ctx.fillStyle = THEME.ribbonFill;
  ctx.fill();
  ctx.fillStyle = THEME.ribbonText;
  ctx.font = `800 ${fontSize}px ${THEME.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

/**
 * Объёмная кнопка. accent: 'yes' (зелёная) | 'no' (оранжевая) | нейтральная кремовая.
 * Минимальный размер 44x44 CSS px обеспечивает вызывающий код.
 */
export function drawButton(ctx, x, y, w, h, label, { accent = null, fontSize = 20 } = {}) {
  ctx.save();
  let fill = '#FBE9C8';
  let fillDark = '#E0C393';
  let textColor = THEME.textDark;
  if (accent === 'yes') { fill = THEME.buttonYes; fillDark = THEME.buttonYesDark; textColor = '#FFFFFF'; }
  if (accent === 'no') { fill = THEME.buttonNo; fillDark = THEME.buttonNoDark; textColor = '#FFFFFF'; }

  const pressDepth = 4;
  // тёмная "подложка" снизу — создаёт объём
  roundRectPath(ctx, x, y + pressDepth, w, h, 12);
  ctx.fillStyle = fillDark;
  ctx.fill();
  // верхняя грань кнопки
  roundRectPath(ctx, x, y, w, h - pressDepth, 12);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = THEME.panelBorder;
  roundRectPath(ctx, x, y, w, h - pressDepth, 12);
  ctx.stroke();

  ctx.font = `800 ${fontSize}px ${THEME.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = THEME.panelBorder;
  ctx.lineJoin = 'round';
  const cy = y + (h - pressDepth) / 2;
  ctx.strokeText(label, x + w / 2, cy + 1);
  ctx.fillStyle = textColor;
  ctx.fillText(label, x + w / 2, cy + 1);
  ctx.restore();
  return { x, y, w, h };
}

export function measureWrapped(ctx, text, maxWidth, fontSpec) {
  ctx.save();
  ctx.font = fontSpec;
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  ctx.restore();
  return lines;
}

export function hitTest(rect, point) {
  if (!rect || !point) return false;
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

/** Масштаб для "pop"-появления окна: 0.8 -> 1.05 -> 1.0 за duration мс. */
export function popScale(elapsedMs, duration = 250) {
  const t = Math.min(1, elapsedMs / duration);
  if (t >= 1) return 1;
  // безье-подобная кривая с небольшим перелётом за 1.0
  if (t < 0.7) {
    const k = t / 0.7;
    return 0.8 + k * 0.25; // 0.8 -> 1.05
  }
  const k = (t - 0.7) / 0.3;
  return 1.05 - k * 0.05; // 1.05 -> 1.0
}
