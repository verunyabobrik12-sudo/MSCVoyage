// Героиня в иллюстрированных сценах: позиция в координатах сцены, спрайт-лист
// 4 направления x 4 кадра (assets/sprites/hero_girl.png + .json), движение
// клавиатурой/тапом-с-поиском-пути, коллизии через CollisionGrid.

import { findScenePath } from './collisionGrid.js';

const ANIM_FPS = 8;
// Запас при выборе направления: ось меняется, только если другая ось больше
// текущей на 25%. Без него на диагонали ~45° поза щёлкала вправо/вниз.
const DIR_HYSTERESIS = 1.25;

/** Прямая видимость между точками: весь отрезок проходим с учётом хитбокса. */
function hasLineOfSight(grid, ax, ay, bx, by) {
  const dist = Math.hypot(bx - ax, by - ay);
  const n = Math.ceil(dist / (grid.step / 2));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!grid.isWalkable(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

/**
 * Спрямление пути A* по сетке: из каждой точки идём сразу к самой дальней
 * видимой. Сеточный путь идёт «лесенкой» (прямо-диагональ-прямо), и на каждой
 * ступеньке поза героини перещёлкивалась. Заодно отбрасывается первая точка —
 * центр стартовой клетки, который мог оказаться за спиной (разворот на кадр).
 */
function smoothPath(grid, sx, sy, path) {
  const out = [];
  let cx = sx;
  let cy = sy;
  let i = 0;
  while (i < path.length) {
    let far = i;
    for (let j = path.length - 1; j > i; j--) {
      if (hasLineOfSight(grid, cx, cy, path[j].x, path[j].y)) { far = j; break; }
    }
    out.push(path[far]);
    cx = path[far].x;
    cy = path[far].y;
    i = far + 1;
  }
  return out;
}

export class IllustratedPlayer {
  constructor(x, y, sheetImage, meta) {
    this.x = x;
    this.y = y;
    this.sheet = sheetImage;
    this.meta = meta; // {frameWidth,frameHeight,feet:[x,y],directions:{down,left,right,up},framesPerRow}
    this.dir = 'down';
    this.animTime = 0;
    this.moving = false;
    this.path = null;
    this.pathIndex = 0;
  }

  moveTo(tx, ty, grid) {
    const path = findScenePath(grid, this.x, this.y, tx, ty);
    if (path) {
      this.path = smoothPath(grid, this.x, this.y, path);
      this.pathIndex = 0;
    }
    return !!path;
  }

  stop() {
    this.path = null;
  }

  isFollowingPath() {
    return !!this.path && this.pathIndex < this.path.length;
  }

  update(dt, input, grid, speed) {
    let dx = 0;
    let dy = 0;
    const axis = input.getMoveAxis();
    const keyboardActive = axis.x !== 0 || axis.y !== 0;

    if (keyboardActive) {
      this.path = null;
      const len = Math.hypot(axis.x, axis.y) || 1;
      dx = (axis.x / len) * speed * dt;
      dy = (axis.y / len) * speed * dt;
    } else if (this.isFollowingPath()) {
      const target = this.path[this.pathIndex];
      const diffX = target.x - this.x;
      const diffY = target.y - this.y;
      const dist = Math.hypot(diffX, diffY);
      const step = speed * dt;
      if (dist <= step || dist < 0.5) {
        this.pathIndex++;
        dx = diffX;
        dy = diffY;
        if (this.pathIndex >= this.path.length) this.path = null;
      } else {
        dx = (diffX / dist) * step;
        dy = (diffY / dist) * step;
      }
    }

    this.moving = dx !== 0 || dy !== 0;
    if (this.moving) {
      this._updateDirection(dx, dy);
      this._tryMove(dx, dy, grid);
      this.animTime += dt;
    } else {
      this.animTime = 0;
    }
  }

  _updateDirection(dx, dy) {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const horizontalNow = this.dir === 'left' || this.dir === 'right';
    // остаёмся на текущей оси, пока другая не перевесит с запасом
    const horizontal = horizontalNow ? ay <= ax * DIR_HYSTERESIS : ax > ay * DIR_HYSTERESIS;
    if (horizontal && dx !== 0) this.dir = dx > 0 ? 'right' : 'left';
    else if (!horizontal && dy !== 0) this.dir = dy > 0 ? 'down' : 'up';
  }

  _tryMove(dx, dy, grid) {
    // Раздельные оси — герой скользит вдоль препятствия, а не залипает.
    if (dx !== 0 && grid.isWalkable(this.x + dx, this.y)) this.x += dx;
    if (dy !== 0 && grid.isWalkable(this.x, this.y + dy)) this.y += dy;
  }

  _currentFrame() {
    const row = this.meta.directions[this.dir];
    const col = this.moving ? Math.floor(this.animTime * ANIM_FPS) % this.meta.framesPerRow : 0;
    return { row, col };
  }

  /** toScreen(x,y) — единая функция перевода координат сцены в экранные. */
  draw(ctx, toScreen, scale, heroScale) {
    const { row, col } = this._currentFrame();
    const fw = this.meta.frameWidth;
    const fh = this.meta.frameHeight;
    const sx = col * fw;
    const sy = row * fh;
    const screen = toScreen(this.x, this.y);
    const totalScale = scale * heroScale;
    const drawW = fw * totalScale;
    const drawH = fh * totalScale;
    const dx = screen.x - this.meta.feet[0] * totalScale;
    const dy = screen.y - this.meta.feet[1] * totalScale;
    ctx.drawImage(this.sheet, sx, sy, fw, fh, dx, dy, drawW, drawH);
  }
}
