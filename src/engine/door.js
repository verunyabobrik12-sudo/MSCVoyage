// Единый механизм дверей: триггерная зона у двери показывает табличку "Да/Нет",
// подход/отход управляет повторным показом. Используется во всех локациях.

import { DoorSign } from './dialogs.js';

export class DoorManager {
  /**
   * @param {Array<{id:string, x:number, y:number, w:number, h:number, label:string,
   *   signX:number, signY:number, target:string}>} doors
   *   x,y,w,h — триггерная зона в мировых координатах (обычно перед дверью);
   *   signX,signY — точка привязки таблички в мировых координатах.
   */
  constructor(doors) {
    this.doors = doors;
    this.dismissed = new Set();
    this.activeDoor = null;
    this.activeSign = null;
  }

  _isPlayerInZone(door, player) {
    return (
      player.x >= door.x &&
      player.x <= door.x + door.w &&
      player.y >= door.y &&
      player.y <= door.y + door.h
    );
  }

  /** @returns {string|null} id двери, в которую игрок вошёл ("target"), либо null. */
  update(player, camera) {
    let anyNear = false;

    for (const door of this.doors) {
      const inZone = this._isPlayerInZone(door, player);
      if (!inZone) {
        this.dismissed.delete(door.id);
        if (this.activeDoor === door.id) {
          this.activeDoor = null;
          this.activeSign = null;
        }
        continue;
      }
      anyNear = true;
      if (!this.dismissed.has(door.id) && !this.activeDoor) {
        this.activeDoor = door.id;
        const screenAnchor = camera.toScreen(door.signX, door.signY);
        this.activeSign = new DoorSign(door.label, screenAnchor.x, screenAnchor.y);
      }
    }

    if (!anyNear) {
      this.activeDoor = null;
      this.activeSign = null;
    }

    return null;
  }

  /** Перерисовать табличку активной двери (координаты экрана пересчитываются на update). */
  draw(ctx, camera) {
    if (!this.activeDoor || !this.activeSign) return;
    const door = this.doors.find((d) => d.id === this.activeDoor);
    const screenAnchor = camera.toScreen(door.signX, door.signY);
    this.activeSign.anchorX = screenAnchor.x;
    this.activeSign.anchorY = screenAnchor.y;
    this.activeSign.draw(ctx);
  }

  /** @returns {string|null} target локации, если нажали "Да"; null иначе. */
  handleTap(point) {
    if (!this.activeSign) return null;
    const action = this.activeSign.handleTap(point);
    if (action === 'yes') {
      const door = this.doors.find((d) => d.id === this.activeDoor);
      this.dismissed.add(this.activeDoor);
      this.activeDoor = null;
      this.activeSign = null;
      return door.target;
    }
    if (action === 'no') {
      this.dismissed.add(this.activeDoor);
      this.activeDoor = null;
      this.activeSign = null;
    }
    return null;
  }

  isShowingSign() {
    return !!this.activeSign;
  }
}
