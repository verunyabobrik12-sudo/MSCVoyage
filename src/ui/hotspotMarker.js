// Векторный значок-"пин" над хотспотом (раздел 7.2). Рисуется в экранных
// координатах, но все размеры заданы в координатах сцены и домножаются на
// текущий scale — значок остаётся пропорционален фону при любом размере окна.

import { THEME } from './theme.js';

const BASE_SIZE = 56; // ~56px в системе сцены 848px, как в спецификации
const BOB_AMPLITUDE = 6;
const BOB_PERIOD = 1.2; // секунд

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} sx экранная X центра основания значка (marker, уже переведён через fitToScreen)
 * @param {number} sy экранная Y
 * @param {number} scale текущий fitScale сцены
 * @param {{type:string, completed:boolean, time:number, near:boolean}} opts
 */
export function drawHotspotMarker(ctx, sx, sy, scale, { type, completed, time, near }) {
  const size = BASE_SIZE * scale * (near ? 1.15 : 1);
  const bob = Math.sin((time / BOB_PERIOD) * Math.PI * 2) * BOB_AMPLITUDE * scale;
  const pulse = 0.5 + 0.5 * Math.sin((time / BOB_PERIOD) * Math.PI * 2 * 1.3);

  const colors = completed ? THEME.hotspotCompleted : (THEME.hotspotColors[type] || THEME.hotspotColors.info);
  const r = size * 0.5;
  const cx = sx;
  const cy = sy - r - bob - size * 0.15; // приподнят над точкой крепления, хвостик указывает вниз

  // мягкая тень на полу под значком (не двигается с покачиванием)
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(sx, sy, r * 0.55, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (!completed) {
    // мерцающее тёплое кольцо вокруг зоны срабатывания
    ctx.save();
    ctx.globalAlpha = 0.25 + pulse * 0.25;
    ctx.strokeStyle = colors.light;
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * (1.3 + pulse * 0.15), r * (0.5 + pulse * 0.06), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // тело пина: капля с хвостиком вниз
  ctx.save();
  ctx.translate(cx, cy);
  const tailLen = r * 0.9;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.arc(0, 0, r, Math.PI, 0, false);
  ctx.lineTo(r * 0.28, r * 0.35);
  ctx.quadraticCurveTo(0, tailLen, -r * 0.28, r * 0.35);
  ctx.closePath();

  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, colors.light);
  grad.addColorStop(1, colors.dark);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 4 * scale;
  ctx.strokeStyle = '#3B2414';
  ctx.stroke();

  // блик слева сверху (свет всегда оттуда)
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.55, r * 0.32, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // лёгкая внутренняя тень снизу
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(r * 0.1, r * 0.55, r * 0.6, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // символ: текстовые глифы для безопасных ASCII-знаков, векторные фигуры
  // для двери/магазина (шрифт может не содержать стрелку/монету).
  ctx.save();
  ctx.translate(cx, cy);
  if (completed) {
    drawTextSymbol(ctx, '✓', r);
  } else if (type === 'door') {
    drawArrowSymbol(ctx, r);
  } else if (type === 'shop') {
    drawCoinSymbol(ctx, r);
  } else {
    drawTextSymbol(ctx, SYMBOLS[type] || '?', r);
  }
  ctx.restore();

  return { cx, cy, r };
}

function drawTextSymbol(ctx, symbol, r) {
  ctx.font = `900 ${Math.round(r * 1.05)}px ${THEME.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.strokeStyle = '#3B2414';
  ctx.strokeText(symbol, 0, r * 0.03);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(symbol, 0, r * 0.03);
}

function drawArrowSymbol(ctx, r) {
  const s = r * 0.55;
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.strokeStyle = '#3B2414';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.6, -s * 0.7);
  ctx.lineTo(s * 0.5, 0);
  ctx.lineTo(-s * 0.6, s * 0.7);
  ctx.lineTo(-s * 0.2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawCoinSymbol(ctx, r) {
  const s = r * 0.55;
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.strokeStyle = '#3B2414';
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = `900 ${Math.round(s * 1.1)}px ${THEME.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = (THEME.hotspotColors.shop || THEME.hotspotColors.info).dark;
  ctx.fillText('$', 0, s * 0.05);
}

const SYMBOLS = {
  quiz: '?',
  minigame: '!',
  info: 'i',
};
