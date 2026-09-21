// Базовый класс комнаты-локации: игрок, камера, коллизии, двери, горячие точки.
// Конкретные локации (Cabin, Corridor, ...) наследуются от него и описывают только
// свою мебель/декор через метод drawDecor(ctx, camera, time).

import { CONFIG } from '../data/config.js';
import { Camera } from './camera.js';
import { Player } from './player.js';
import { DoorManager } from './door.js';
import { HotspotManager } from './hotspot.js';
import { Storage } from './storage.js';
import { drawText } from '../art/font.js';
import { PALETTE } from '../art/palette.js';

const SCREEN_W = CONFIG.screen.width;
const SCREEN_H = CONFIG.screen.height;
const HUD_BOTTOM_H = 22; // резерв под нижнюю панель локации (полноценный HUD — этап 8)

export class RoomScene {
  /**
   * @param {{game:object, tileMap:import('./tilemap.js').TileMap, spawnX:number, spawnY:number,
   *   doors?:Array, hotspots?:Array, locationLabel:string}} opts
   */
  constructor({ game, tileMap, spawnX, spawnY, doors = [], hotspots = [], locationLabel }) {
    this.game = game;
    this.tileMap = tileMap;
    this.spawnX = spawnX;
    this.spawnY = spawnY;
    this.locationLabel = locationLabel;
    this.camera = new Camera(SCREEN_W, SCREEN_H - HUD_BOTTOM_H);
    this.doorManager = new DoorManager(doors);
    this.hotspotManager = new HotspotManager(hotspots);
    this.time = 0;
    this.player = null;
  }

  enter() {
    const character = Storage.get().character || 'girl';
    this.player = new Player(this.spawnX, this.spawnY, character);
  }

  exit() {}

  update(dt, input) {
    this.time += dt;

    if (this.hotspotManager.isDialogOpen()) {
      // Пока открыт диалог предмета, движение и другие тапы не обрабатываем —
      // тап уже перехватывается в handleTap().
    } else {
      this.player.update(dt, input, this.tileMap);
      this.doorManager.update(this.player, this.camera);
      this.hotspotManager.update(this.player, SCREEN_W, SCREEN_H);
    }

    this.camera.follow(this.player.x, this.player.y, this.tileMap.width, this.tileMap.height);

    const tap = input.consumeTap();
    if (tap) this._handleTap(tap);
  }

  _handleTap(screenPoint) {
    if (this.hotspotManager.isDialogOpen()) {
      const action = this.hotspotManager.handleTap(screenPoint, this.player, this.camera, SCREEN_W, SCREEN_H, this.tileMap);
      if (action === 'play') {
        const hotspot = this.hotspotManager.getOpenHotspot();
        this.hotspotManager.closeDialog();
        hotspot?.onPlay?.();
      }
      return;
    }

    if (this.doorManager.isShowingSign()) {
      const target = this.doorManager.handleTap(screenPoint);
      if (target) {
        this.onDoorEnter(target);
        return;
      }
      return;
    }

    const hotAction = this.hotspotManager.handleTap(screenPoint, this.player, this.camera, SCREEN_W, SCREEN_H, this.tileMap);
    if (hotAction === 'play') {
      const hotspot = this.hotspotManager.getOpenHotspot();
      this.hotspotManager.closeDialog();
      hotspot?.onPlay?.();
      return;
    }
    // 'closed' (диалог только что закрыт) или 'pending' (герой пошёл к предмету/диалог
    // только что открылся) — тап уже обработан, дальше на пол его вести не нужно.
    if (hotAction) return;

    // Не задели дверь/предмет — идём в указанную точку пола.
    const worldPoint = this.camera.toWorld(screenPoint.x, screenPoint.y);
    this.player.moveTo(worldPoint.x, worldPoint.y, this.tileMap);
  }

  /** Переопределяется наследником: что делать при входе в дверь (переход сцены). */
  onDoorEnter(_target) {}

  /** Переопределяется наследником: отрисовка пола/мебели/декора локации. */
  drawDecor(_ctx, _camera, _time) {}

  draw(ctx) {
    this.drawDecor(ctx, this.camera, this.time);
    this.hotspotManager.draw(ctx, this.camera, this.time);
    this.player.draw(ctx, this.camera);
    this.doorManager.draw(ctx, this.camera);

    this._drawBottomBar(ctx);
  }

  _drawBottomBar(ctx) {
    ctx.fillStyle = PALETTE.fabricBlueDark;
    ctx.fillRect(0, SCREEN_H - HUD_BOTTOM_H, SCREEN_W, HUD_BOTTOM_H);
    drawText(ctx, this.locationLabel, 8, SCREEN_H - HUD_BOTTOM_H + 8, { scale: 1, color: PALETTE.white });
  }
}
