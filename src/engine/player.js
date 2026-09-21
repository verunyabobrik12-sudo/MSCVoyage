// Персонаж игрока: движение (клавиатура + тап-к-точке через pathfinding),
// коллизии со стенами/мебелью, направление и фаза анимации.
// Отрисовка спрайта вынесена в art/assets.js, чтобы потом заменить на PNG.

import { CONFIG } from '../data/config.js';
import { PathFollower, findPath } from './pathfinding.js';
import { Assets } from '../art/assets.js';

export class Player {
  constructor(x, y, character = 'girl') {
    this.x = x;
    this.y = y;
    this.character = character; // 'girl' | 'boy'
    this.dir = 'down';
    this.moving = false;
    this.animTime = 0;
    this.follower = new PathFollower();
    this.radius = 5;
  }

  /** Тап/клик по полу локации — построить путь и пойти туда. */
  moveTo(worldX, worldY, tileMap) {
    const path = findPath(tileMap, this.x, this.y, worldX, worldY);
    if (path) this.follower.setPath(path);
  }

  stop() {
    this.follower.clear();
  }

  update(dt, input, tileMap) {
    let dx = 0;
    let dy = 0;
    const axis = input.getMoveAxis();
    const keyboardActive = axis.x !== 0 || axis.y !== 0;

    if (keyboardActive) {
      this.follower.clear(); // клавиатура прерывает автопуть
      const len = Math.hypot(axis.x, axis.y) || 1;
      dx = (axis.x / len) * CONFIG.player.speed * dt;
      dy = (axis.y / len) * CONFIG.player.speed * dt;
    } else if (this.follower.isActive()) {
      const result = this.follower.step(this.x, this.y, CONFIG.player.speed, dt);
      dx = result.dx;
      dy = result.dy;
    }

    this.moving = dx !== 0 || dy !== 0;

    if (this.moving) {
      this._updateDirection(dx, dy);
      this._tryMove(dx, dy, tileMap);
      this.animTime += dt;
    } else {
      this.animTime += dt; // используется для лёгкого покачивания в покое
    }
  }

  _updateDirection(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.dir = dx > 0 ? 'right' : 'left';
    } else if (dy !== 0) {
      this.dir = dy > 0 ? 'down' : 'up';
    }
  }

  _tryMove(dx, dy, tileMap) {
    // Двигаем по осям раздельно — так персонаж скользит вдоль стен, а не залипает.
    if (dx !== 0 && tileMap.isPointWalkable(this.x + dx, this.y, this.radius)) {
      this.x += dx;
    }
    if (dy !== 0 && tileMap.isPointWalkable(this.x, this.y + dy, this.radius)) {
      this.y += dy;
    }
  }

  draw(ctx, camera) {
    const screen = camera.toScreen(this.x, this.y);
    Assets.drawPlayer(ctx, this.character, screen.x, screen.y, this.dir, this.animTime, this.moving);
  }
}
