// Сцена на готовой иллюстрации: фон + коллизии по полигонам + перекрытия +
// горячие точки, которые срабатывают сами при входе в зону. Единая функция
// перевода координат (sceneToScreen/screenToScene) используется для ВСЕГО:
// фона, героя, перекрытий, значков, попадания тапа и режима отладки F2.

import { CollisionGrid } from './collisionGrid.js';
import { pointInTrigger, pointInPolygon } from './polygon.js';
import { IllustratedPlayer } from './illustratedPlayer.js';
import { drawHotspotMarker } from '../ui/hotspotMarker.js';
import { ConfirmDialog, InfoBubble } from '../ui/dialogs.js';
import { THEME } from '../ui/theme.js';
import { Sound } from './sound.js';
import { CONFIG } from '../data/config.js';

const ENTRY_GUARD_MS = 1500;
const DISMISS_MARGIN = 30;
const MARKER_TAP_RADIUS = 46; // в координатах сцены — тап рядом со значком подводит героя

export class IllustratedScene {
  constructor({ game, sceneData, bgImage, heroSheet, heroMeta }) {
    this.game = game;
    this.data = sceneData;
    this.bgImage = bgImage;
    this.heroSheet = heroSheet;
    this.heroMeta = heroMeta;
    this.grid = new CollisionGrid(sceneData, {
      hitboxHalfW: CONFIG.illustrated.hitboxHalfW,
      hitboxHalfH: CONFIG.illustrated.hitboxHalfH,
    });
    this.heroScale = CONFIG.illustrated.heroTargetHeight / heroMeta.frameHeight;

    this.time = 0;
    this.lastDt = 1 / 60;
    this.player = null;
    this.dialog = null;
    this.dialogItem = null;
    this.infoBubble = null;
    this.shownInfoIds = new Set();
    this.dismissedIds = new Set();
    this.entryGuardTimer = ENTRY_GUARD_MS;
    this.entryDoorId = null;
    this.overlayAlpha = {};
    this.transform = { scale: 1, offsetX: 0, offsetY: 0 };

    this.debugMode = false;
    this.debugMaskView = false; // клавиша M
    this.debugOverlayOnly = false; // клавиша T
    this.lastCursorScene = null;

    this.sceneToScreen = this.sceneToScreen.bind(this);
  }

  enter(spawnPoint, entryDoorId = null) {
    const [sx, sy] = spawnPoint || this.data.spawn;
    this.player = new IllustratedPlayer(sx, sy, this.heroSheet, this.heroMeta);
    this.entryGuardTimer = ENTRY_GUARD_MS;
    this.entryDoorId = entryDoorId;
    this.shownInfoIds.clear();
    this.dismissedIds.clear();
    this.dialog = null;
    this.dialogItem = null;
    this.infoBubble = null;
  }

  setTransform(scale, offsetX, offsetY) {
    this.transform = { scale, offsetX, offsetY };
  }

  sceneToScreen(x, y) {
    return {
      x: x * this.transform.scale + this.transform.offsetX,
      y: y * this.transform.scale + this.transform.offsetY,
    };
  }

  screenToScene(x, y) {
    return {
      x: (x - this.transform.offsetX) / this.transform.scale,
      y: (y - this.transform.offsetY) / this.transform.scale,
    };
  }

  update(dt, input) {
    this.time += dt;
    this.lastDt = dt;
    if (this.entryGuardTimer > 0) this.entryGuardTimer -= dt * 1000;

    if (input.consumeKeyPress('F2')) this.debugMode = !this.debugMode;
    if (this.debugMode) {
      if (input.consumeKeyPress('KeyM')) this.debugMaskView = !this.debugMaskView;
      if (input.consumeKeyPress('KeyT')) this.debugOverlayOnly = !this.debugOverlayOnly;
    }

    if (this.dialog) {
      this.dialog.update(dt);
    } else if (this.infoBubble) {
      this.infoBubble.update(dt);
      if (this.infoBubble.isExpired()) this.infoBubble = null;
    } else {
      this.player.update(dt, input, this.grid, CONFIG.illustrated.playerSpeed);
      this._checkTriggers();
    }

    const tap = input.consumeTap();
    if (tap) this._handleTap(tap);

    if (input.isCancelPressed()) {
      if (this.dialog) { this.dialog = null; this.dialogItem = null; }
      else if (this.infoBubble) this.infoBubble = null;
    }
  }

  _allTriggerables() {
    const hs = this.data.hotspots.map((h) => ({ ...h, kind: 'hotspot' }));
    const doors = this.data.doors.map((d) => ({ ...d, kind: 'door', type: 'door' }));
    return [...hs, ...doors];
  }

  _expandTrigger(trigger, margin) {
    if (trigger.shape === 'circle') return { shape: 'circle', x: trigger.x, y: trigger.y, r: trigger.r + margin };
    return { shape: 'rect', x: trigger.x - margin, y: trigger.y - margin, w: trigger.w + margin * 2, h: trigger.h + margin * 2 };
  }

  _checkTriggers() {
    const px = this.player.x;
    const py = this.player.y;
    let nearest = null;
    let nearestDist = Infinity;

    for (const item of this._allTriggerables()) {
      if (item.kind === 'door' && item.id === this.entryDoorId && this.entryGuardTimer > 0) continue;
      if (this.dismissedIds.has(item.id)) {
        if (!pointInTrigger(px, py, this._expandTrigger(item.trigger, DISMISS_MARGIN))) {
          this.dismissedIds.delete(item.id);
        }
        continue;
      }
      if (item.kind === 'hotspot' && item.type === 'info' && this.shownInfoIds.has(item.id)) continue;
      if (pointInTrigger(px, py, item.trigger)) {
        const mx = item.marker[0];
        const my = item.marker[1];
        const d = Math.hypot(px - mx, py - my);
        if (d < nearestDist) { nearest = item; nearestDist = d; }
      }
    }
    if (nearest) this._fireTrigger(nearest);
  }

  _fireTrigger(item) {
    this.player.stop();
    Sound.bell();
    if (item.kind === 'door') {
      this.dialog = new ConfirmDialog({ message: item.label });
      this.dialogItem = item;
      return;
    }
    if (item.type === 'info') {
      this.shownInfoIds.add(item.id);
      this.infoBubble = new InfoBubble({ title: item.label, fact: item.fact });
      return;
    }
    this.dialog = new ConfirmDialog({ title: item.label, message: item.description });
    this.dialogItem = item;
  }

  _handleTap(screenPoint) {
    if (this.dialog) {
      const action = this.dialog.handleTap(screenPoint);
      if (action === 'yes') {
        const item = this.dialogItem;
        // Разряжаем точку сразу — активность (викторина/переход) обычно уводит
        // игрока со сцены не мгновенно, а на следующем кадре герой всё ещё
        // может стоять в той же зоне триггера, и он тут же сработает снова.
        this.dismissedIds.add(item.id);
        this.dialog = null;
        this.dialogItem = null;
        this._activate(item);
      } else if (action === 'no') {
        this.dismissedIds.add(this.dialogItem.id);
        this.dialog = null;
        this.dialogItem = null;
      }
      return;
    }
    if (this.infoBubble) {
      this.infoBubble = null;
      return;
    }

    const scenePoint = this.screenToScene(screenPoint.x, screenPoint.y);

    for (const item of this._allTriggerables()) {
      const [mx, my] = item.marker;
      if (Math.hypot(scenePoint.x - mx, scenePoint.y - my) <= MARKER_TAP_RADIUS) {
        this.dismissedIds.delete(item.id);
        const t = item.trigger;
        const tx = t.shape === 'circle' ? t.x : t.x + t.w / 2;
        const ty = t.shape === 'circle' ? t.y : t.y + t.h / 2;
        this.player.moveTo(tx, ty, this.grid);
        return;
      }
    }
    this.player.moveTo(scenePoint.x, scenePoint.y, this.grid);
  }

  _activate(item) {
    if (item.kind === 'door') {
      Sound.doorOpen();
      this.game.onSceneDoor?.(item);
      return;
    }
    this.game.onHotspotPlay?.(item, this.data.id);
  }

  draw(ctx, canvasW, canvasH) {
    const scale = this.transform.scale;
    const topLeft = this.sceneToScreen(0, 0);
    const drawW = this.data.size[0] * scale;
    const drawH = this.data.size[1] * scale;

    ctx.fillStyle = '#12191f';
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (this.bgImage) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.bgImage, topLeft.x, topLeft.y, drawW, drawH);
    }

    if (this.player) this.player.draw(ctx, this.sceneToScreen, scale, this.heroScale);
    this._drawOverlaysOnTop(ctx, topLeft, drawW, drawH);
    this._drawMarkers(ctx);

    if (this.debugMode) this._drawDebug(ctx);

    this._drawBottomBar(ctx, canvasW, canvasH);

    if (this.infoBubble) this.infoBubble.draw(ctx, canvasW, canvasH);
    if (this.dialog) this.dialog.draw(ctx, canvasW, canvasH);
  }

  _drawOverlaysOnTop(ctx, topLeft, drawW, drawH) {
    if (!this.bgImage || !this.player) return;
    for (const overlay of this.data.overlays || []) {
      if (this.player.y >= overlay.sortY) continue; // герой ближе к камере — он и так поверх
      const inside = pointInPolygon(this.player.x, this.player.y, overlay.polygon);
      const target = inside ? THEME.overlayFadeAlpha : 1;
      const prev = this.overlayAlpha[overlay.id] ?? 1;
      const alpha = prev + (target - prev) * Math.min(1, this.lastDt * 6);
      this.overlayAlpha[overlay.id] = alpha;

      ctx.save();
      ctx.beginPath();
      const pts = overlay.polygon;
      const s0 = this.sceneToScreen(pts[0][0], pts[0][1]);
      ctx.moveTo(s0.x, s0.y);
      for (let i = 1; i < pts.length; i++) {
        const s = this.sceneToScreen(pts[i][0], pts[i][1]);
        ctx.lineTo(s.x, s.y);
      }
      ctx.closePath();
      ctx.clip();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.bgImage, topLeft.x, topLeft.y, drawW, drawH);
      ctx.restore();
    }
  }

  _drawMarkers(ctx) {
    for (const hotspot of this.data.hotspots) {
      const completed = this._isHotspotCompleted(hotspot);
      const screen = this.sceneToScreen(hotspot.marker[0], hotspot.marker[1]);
      const near = this.player && pointInTrigger(this.player.x, this.player.y, hotspot.trigger);
      drawHotspotMarker(ctx, screen.x, screen.y, this.transform.scale, {
        type: hotspot.type, completed, time: this.time, near,
      });
    }
    for (const door of this.data.doors) {
      const screen = this.sceneToScreen(door.marker[0], door.marker[1]);
      const near = this.player && pointInTrigger(this.player.x, this.player.y, door.trigger);
      drawHotspotMarker(ctx, screen.x, screen.y, this.transform.scale, {
        type: 'door', completed: false, time: this.time, near,
      });
    }
  }

  _isHotspotCompleted(hotspot) {
    return this.game.isHotspotCompleted?.(hotspot.id) ?? false;
  }

  _drawBottomBar(ctx, canvasW, canvasH) {
    const h = Math.max(40, Math.min(56, canvasH * 0.06));
    ctx.save();
    ctx.fillStyle = 'rgba(59,36,20,0.82)';
    ctx.fillRect(0, canvasH - h, canvasW, h);
    ctx.fillStyle = '#FFF3D6';
    ctx.font = `800 18px ${THEME.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.data.label, 16, canvasH - h / 2);
    ctx.restore();
  }

  // ===================== F2 — РЕЖИМ РАЗМЕТКИ/ОТЛАДКИ =====================
  setCursorScreen(sx, sy) {
    this.lastCursorScene = this.screenToScene(sx, sy);
  }

  _drawDebug(ctx) {
    const scale = this.transform.scale;
    // маска проходимости
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.cols; col++) {
        const walkable = this.grid.cellWalkable(col, row);
        ctx.fillStyle = walkable ? '#2ecc71' : '#e74c3c';
        const world = this.grid.toWorld(col, row);
        const screen = this.sceneToScreen(world.x - this.grid.step / 2, world.y - this.grid.step / 2);
        ctx.fillRect(screen.x, screen.y, this.grid.step * scale, this.grid.step * scale);
      }
    }
    ctx.restore();

    // зоны trigger, цвет по типу, ярче если "заряжена"
    for (const item of this._allTriggerables()) {
      const charged = !this.dismissedIds.has(item.id);
      const color = item.kind === 'door' ? THEME.hotspotColors.door : (THEME.hotspotColors[item.type] || THEME.hotspotColors.info);
      ctx.save();
      ctx.globalAlpha = charged ? 0.5 : 0.2;
      ctx.strokeStyle = color.dark;
      ctx.lineWidth = 2;
      ctx.fillStyle = color.light;
      ctx.globalAlpha = charged ? 0.25 : 0.1;
      this._traceTrigger(ctx, item.trigger);
      ctx.fill();
      ctx.globalAlpha = charged ? 0.9 : 0.35;
      this._traceTrigger(ctx, item.trigger);
      ctx.stroke();
      ctx.restore();

      const markerScreen = this.sceneToScreen(item.marker[0], item.marker[1]);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.beginPath();
      ctx.arc(markerScreen.x, markerScreen.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // перекрытия (клавиша T — только они, поверх маски)
    if (this.debugOverlayOnly) {
      for (const overlay of this.data.overlays || []) {
        ctx.save();
        ctx.strokeStyle = '#f1c40f';
        ctx.fillStyle = 'rgba(241,196,15,0.2)';
        ctx.lineWidth = 2;
        const pts = overlay.polygon;
        ctx.beginPath();
        const s0 = this.sceneToScreen(pts[0][0], pts[0][1]);
        ctx.moveTo(s0.x, s0.y);
        for (let i = 1; i < pts.length; i++) {
          const s = this.sceneToScreen(pts[i][0], pts[i][1]);
          ctx.lineTo(s.x, s.y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // хитбокс героя
    if (this.player) {
      const screen = this.sceneToScreen(this.player.x, this.player.y);
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(screen.x, screen.y, CONFIG.illustrated.hitboxHalfW * scale, CONFIG.illustrated.hitboxHalfH * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // координаты курсора
    if (this.lastCursorScene) {
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.fillRect(8, 8, 150, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(this.lastCursorScene.x)}, ${Math.round(this.lastCursorScene.y)}`, 14, 21);
      ctx.restore();
    }
  }

  _traceTrigger(ctx, trigger) {
    ctx.beginPath();
    if (trigger.shape === 'circle') {
      const s = this.sceneToScreen(trigger.x, trigger.y);
      ctx.arc(s.x, s.y, trigger.r * this.transform.scale, 0, Math.PI * 2);
    } else {
      const s = this.sceneToScreen(trigger.x, trigger.y);
      ctx.rect(s.x, s.y, trigger.w * this.transform.scale, trigger.h * this.transform.scale);
    }
  }
}
