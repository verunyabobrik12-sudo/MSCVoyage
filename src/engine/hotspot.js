// Интерактивные предметы локации (викторины, мини-игры, магазин).
// Диалог "Играть/Не сейчас" открывается сам, как только герой оказывается рядом
// с предметом — неважно, дошёл ли он туда стрелками/WASD или тапом-по-полу
// издалека. Тап прямо по предмету (или по значку над ним) сразу запускает
// подход, если герой ещё не рядом.

import { ConfirmDialog } from './dialogs.js';
import { hitTest } from './ui.js';
import { STRINGS } from '../data/strings.ru.js';
import { PALETTE } from '../art/palette.js';
import { drawText, measureText } from '../art/font.js';

const APPROACH_RADIUS = 22;
const ICON_HIT_PAD = 30; // значок рисуется выше предмета — клик по нему тоже должен засчитываться

// Иконка над предметом сообщает тип активности издалека, не только близко.
const KIND_ICON = {
  quiz: '?',
  minigame: '★',
  shop: '✓',
};

export class HotspotManager {
  /**
   * @param {Array<{id:string, x:number, y:number, w:number, h:number, approachX:number,
   *   approachY:number, title:string, description:string, isCompleted:()=>boolean}>} hotspots
   */
  constructor(hotspots) {
    this.hotspots = hotspots;
    this.dialog = null;
    this.openId = null;
    this.dismissedNearId = null; // не переоткрывать сразу же после "Не сейчас", пока герой не отойдёт
  }

  _center(h) {
    return { x: h.x + h.w / 2, y: h.y + h.h / 2 };
  }

  _isNear(hotspot, player) {
    const c = this._center(hotspot);
    return Math.hypot(player.x - c.x, player.y - c.y) <= APPROACH_RADIUS;
  }

  /** Вызывать каждый кадр: открывает диалог, как только герой оказался рядом с предметом. */
  update(player, screenW, screenH) {
    if (this.dialog) return;

    for (const hotspot of this.hotspots) {
      const near = this._isNear(hotspot, player);
      if (near && this.dismissedNearId !== hotspot.id) {
        this._openPrompt(hotspot, screenW, screenH);
        return;
      }
      if (!near && this.dismissedNearId === hotspot.id) {
        this.dismissedNearId = null; // герой отошёл — в следующий раз диалог снова предложится
      }
    }
  }

  _openPrompt(hotspot, screenW, screenH) {
    this.openId = hotspot.id;
    this.dialog = new ConfirmDialog({
      title: hotspot.title,
      message: hotspot.description,
      confirmLabel: STRINGS.common.play,
      cancelLabel: STRINGS.common.notNow,
      screenW,
      screenH,
    });
  }

  isDialogOpen() {
    return !!this.dialog;
  }

  /**
   * Обработать тап. Возвращает 'play' (запустить активность openId), 'closed' (диалог закрыт),
   * 'pending' (герой пошёл к предмету — тап обработан, дальше решать нечего) или null
   * (тап не задел ни диалог, ни предмет — вызывающий код может считать это кликом по полу).
   */
  handleTap(point, player, camera, screenW, screenH, tileMap) {
    if (this.dialog) {
      const action = this.dialog.handleTap(point);
      if (action === 'confirm') {
        this.dialog = null;
        return 'play';
      }
      if (action === 'cancel') {
        this.dialog = null;
        this.dismissedNearId = this.openId;
        this.openId = null;
        return 'closed';
      }
      return 'pending'; // тап внутри модалки, но мимо кнопок — не должен уходить дальше на пол
    }

    for (const hotspot of this.hotspots) {
      const topLeft = camera.toScreen(hotspot.x, hotspot.y);
      // Зона клика включает и сам предмет, и пульсирующий значок над ним —
      // визуально это одна "кнопка", хотя рисуются они раздельно.
      const rect = {
        x: topLeft.x,
        y: topLeft.y - ICON_HIT_PAD,
        w: hotspot.w,
        h: hotspot.h + ICON_HIT_PAD,
      };
      if (hitTest(rect, point)) {
        if (this._isNear(hotspot, player)) {
          this._openPrompt(hotspot, screenW, screenH);
        } else {
          // Диалог сам откроется в update(), как только герой дойдёт и окажется рядом.
          this.dismissedNearId = null;
          const approach = hotspot.approachX != null
            ? { x: hotspot.approachX, y: hotspot.approachY }
            : this._center(hotspot);
          player.moveTo(approach.x, approach.y, tileMap);
        }
        return 'pending';
      }
    }
    return null;
  }

  getOpenHotspot() {
    return this.hotspots.find((h) => h.id === this.openId) || null;
  }

  closeDialog() {
    this.dialog = null;
    this.openId = null;
  }

  draw(ctx, camera, time) {
    for (const hotspot of this.hotspots) {
      const screen = camera.toScreen(hotspot.x, hotspot.y);
      const completed = hotspot.isCompleted?.();
      this._drawHighlight(ctx, screen.x, screen.y, hotspot.w, hotspot.h, time, completed, hotspot.kind);
    }
    if (this.dialog) this.dialog.draw(ctx);
  }

  _drawHighlight(ctx, x, y, w, h, time, completed, kind) {
    ctx.save();
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.strokeStyle = completed ? PALETTE.uiSuccess : PALETTE.uiGold;
    ctx.globalAlpha = completed ? 0.6 : 0.4 + pulse * 0.5;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    ctx.restore();

    // Крупный пульсирующий значок над предметом — виден издалека, не только вплотную.
    const scale = 2;
    const bob = Math.round(pulse * 2);
    const cx = x + w / 2;
    const iconY = y - 20 - bob;

    if (completed) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = PALETTE.uiSuccess;
      ctx.beginPath();
      ctx.arc(cx, iconY + 6, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawText(ctx, '✓', cx - measureText('✓', scale) / 2, iconY, { scale, color: PALETTE.white });
    } else {
      const icon = KIND_ICON[kind] || '!';
      ctx.save();
      ctx.globalAlpha = 0.55 + pulse * 0.35;
      ctx.fillStyle = PALETTE.uiDanger;
      ctx.beginPath();
      ctx.arc(cx, iconY + 6, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawText(ctx, icon, cx - measureText(icon, scale) / 2, iconY, { scale, color: PALETTE.white });
    }
  }
}
