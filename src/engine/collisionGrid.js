// Проходимость для иллюстрированных сцен: "запрещено всё, что не разрешено".
// Итоговая маска = walkable минус blockers, с учётом эллиптического хитбокса
// героя (раздутие препятствий на радиус хитбокса реализовано проверкой
// нескольких точек хитбокса вместо геометрического офсета полигонов —
// проще и достаточно точно при шаге сетки 8px).

import { pointInPolygon, pointInBlocker } from './polygon.js';

export const HITBOX_HALF_W = 12;
export const HITBOX_HALF_H = 6;
export const GRID_STEP = 8;

export class CollisionGrid {
  constructor(sceneData, opts = {}) {
    this.sceneW = sceneData.size[0];
    this.sceneH = sceneData.size[1];
    this.step = opts.step || GRID_STEP;
    this.halfW = opts.hitboxHalfW || HITBOX_HALF_W;
    this.halfH = opts.hitboxHalfH || HITBOX_HALF_H;
    this.walkablePolys = sceneData.walkable || [];
    this.blockers = sceneData.blockers || [];
    this.cols = Math.ceil(this.sceneW / this.step);
    this.rows = Math.ceil(this.sceneH / this.step);
    this.grid = new Uint8Array(this.cols * this.rows);
    this._build();
  }

  _isPointFree(x, y) {
    let inWalkable = false;
    for (const poly of this.walkablePolys) {
      if (pointInPolygon(x, y, poly)) { inWalkable = true; break; }
    }
    if (!inWalkable) return false;
    for (const b of this.blockers) {
      if (pointInBlocker(x, y, b)) return false;
    }
    return true;
  }

  /** Проходимость точки С УЧЁТОМ хитбокса героя (для движения/поиска пути). */
  isWalkable(x, y) {
    return this._isPointFree(x, y)
      && this._isPointFree(x - this.halfW, y)
      && this._isPointFree(x + this.halfW, y)
      && this._isPointFree(x, y - this.halfH)
      && this._isPointFree(x, y + this.halfH);
  }

  _build() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const x = col * this.step + this.step / 2;
        const y = row * this.step + this.step / 2;
        this.grid[row * this.cols + col] = this.isWalkable(x, y) ? 1 : 0;
      }
    }
  }

  cellWalkable(col, row) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false;
    return this.grid[row * this.cols + col] === 1;
  }

  toGrid(x, y) {
    return { col: Math.floor(x / this.step), row: Math.floor(y / this.step) };
  }

  toWorld(col, row) {
    return { x: col * this.step + this.step / 2, y: row * this.step + this.step / 2 };
  }

  /** Ближайшая проходимая клетка (расширяющееся кольцо) — для недостижимой цели. */
  findNearestWalkable(col, row) {
    const maxR = Math.max(this.cols, this.rows);
    for (let r = 0; r <= maxR; r++) {
      for (let dr = -r; dr <= r; dr++) {
        for (let dc = -r; dc <= r; dc++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== r) continue;
          if (this.cellWalkable(col + dc, row + dr)) return { col: col + dc, row: row + dr };
        }
      }
    }
    return null;
  }
}

/** A* по сетке с 8-связностью. Возвращает массив мировых точек-waypoint'ов либо null. */
export function findScenePath(grid, fromX, fromY, toX, toY) {
  const start = grid.toGrid(fromX, fromY);
  let goal = grid.toGrid(toX, toY);
  let exactGoal = true; // цель проходима как есть — можно дойти до точных toX/toY

  if (!grid.cellWalkable(start.col, start.row)) return null;
  if (!grid.cellWalkable(goal.col, goal.row)) {
    const alt = grid.findNearestWalkable(goal.col, goal.row);
    if (!alt) return null;
    goal = alt;
    exactGoal = false; // цель заменена ближайшей доступной — НЕЛЬЗЯ довести до исходных toX/toY,
    // иначе последний шаг уйдёт обратно в препятствие
  }
  if (start.col === goal.col && start.row === goal.row) {
    return exactGoal ? [{ x: toX, y: toY }] : [grid.toWorld(goal.col, goal.row)];
  }

  const key = (c, r) => `${c},${r}`;
  const neighbors = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ];

  const gScore = new Map([[key(start.col, start.row), 0]]);
  const cameFrom = new Map();
  const open = [{ col: start.col, row: start.row, f: 0 }];
  const closed = new Set();
  const h = (c, r) => Math.hypot(c - goal.col, r - goal.row);

  let iterations = 0;
  const maxIterations = grid.cols * grid.rows;

  while (open.length > 0 && iterations++ < maxIterations) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    const curKey = key(cur.col, cur.row);
    if (closed.has(curKey)) continue;
    closed.add(curKey);

    if (cur.col === goal.col && cur.row === goal.row) {
      const path = [];
      let ck = curKey;
      while (ck) {
        const [c, r] = ck.split(',').map(Number);
        path.push(grid.toWorld(c, r));
        ck = cameFrom.get(ck);
      }
      path.reverse();
      if (path.length > 0 && exactGoal) path[path.length - 1] = { x: toX, y: toY };
      return path;
    }

    for (const [dc, dr, cost] of neighbors) {
      const nc = cur.col + dc;
      const nr = cur.row + dr;
      if (!grid.cellWalkable(nc, nr)) continue;
      // не срезаем углы по диагонали впритык к препятствию
      if (dc !== 0 && dr !== 0 && (!grid.cellWalkable(cur.col + dc, cur.row) || !grid.cellWalkable(cur.col, cur.row + dr))) continue;
      const nKey = key(nc, nr);
      if (closed.has(nKey)) continue;
      const tentativeG = (gScore.get(curKey) ?? Infinity) + cost;
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        gScore.set(nKey, tentativeG);
        cameFrom.set(nKey, curKey);
        open.push({ col: nc, row: nr, f: tentativeG + h(nc, nr) });
      }
    }
  }
  return null;
}
