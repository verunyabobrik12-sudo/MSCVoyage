// Поиск пути по сетке (BFS по 4-связности с отсечением углов) для тапа "иди сюда".

import { TileMap, TILE_SIZE } from './tilemap.js';

/**
 * Находит путь между двумя точками в мировых координатах.
 * Возвращает массив мировых точек-waypoint'ов (центры тайлов) либо null, если пути нет.
 */
export function findPath(map, fromX, fromY, toX, toY) {
  const start = map.worldToGrid(fromX, fromY);
  const goal = map.worldToGrid(toX, toY);

  if (!map.isWalkable(goal.col, goal.row)) {
    // Цель непроходима (тап в стену/мебель) — ищем ближайший проходимый тайл рядом.
    const alt = findNearestWalkable(map, goal.col, goal.row);
    if (!alt) return null;
    goal.col = alt.col;
    goal.row = alt.row;
  }
  if (!map.isWalkable(start.col, start.row)) return null;

  const cameFrom = new Map();
  const key = (c, r) => `${c},${r}`;
  const visited = new Set([key(start.col, start.row)]);
  const queue = [start];
  let found = false;

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.col === goal.col && cur.row === goal.row) {
      found = true;
      break;
    }
    const neighbors = [
      { col: cur.col + 1, row: cur.row },
      { col: cur.col - 1, row: cur.row },
      { col: cur.col, row: cur.row + 1 },
      { col: cur.col, row: cur.row - 1 },
    ];
    for (const n of neighbors) {
      const k = key(n.col, n.row);
      if (!visited.has(k) && map.isWalkable(n.col, n.row)) {
        visited.add(k);
        cameFrom.set(k, cur);
        queue.push(n);
      }
    }
  }

  if (!found) return null;

  // Восстанавливаем путь от цели к старту.
  const path = [];
  let cur = goal;
  while (!(cur.col === start.col && cur.row === start.row)) {
    path.push(map.gridToWorldCenter(cur.col, cur.row));
    cur = cameFrom.get(key(cur.col, cur.row));
  }
  path.reverse();
  // Последнюю точку заменяем на точный тап (плавнее приход в цель).
  if (path.length > 0) path[path.length - 1] = { x: toX, y: toY };
  return path;
}

function findNearestWalkable(map, col, row) {
  for (let radius = 1; radius <= 3; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (map.isWalkable(col + dc, row + dr)) return { col: col + dc, row: row + dr };
      }
    }
  }
  return null;
}

/** Хелпер: ведёт сущность по массиву waypoint'ов с заданной скоростью (px/сек). */
export class PathFollower {
  constructor() {
    this.path = null;
    this.index = 0;
  }

  setPath(path) {
    this.path = path;
    this.index = 0;
  }

  clear() {
    this.path = null;
  }

  isActive() {
    return !!this.path && this.index < this.path.length;
  }

  /** Возвращает {dx, dy, arrived} — смещение за кадр и флаг завершения пути. */
  step(entityX, entityY, speed, dt) {
    if (!this.isActive()) return { dx: 0, dy: 0, arrived: true, moving: false };
    const target = this.path[this.index];
    const diffX = target.x - entityX;
    const diffY = target.y - entityY;
    const dist = Math.hypot(diffX, diffY);
    const step = speed * dt;

    if (dist <= step || dist < 0.5) {
      this.index++;
      if (this.index >= this.path.length) {
        this.path = null;
        return { dx: diffX, dy: diffY, arrived: true, moving: true };
      }
      return { dx: diffX, dy: diffY, arrived: false, moving: true };
    }
    return { dx: (diffX / dist) * step, dy: (diffY / dist) * step, arrived: false, moving: true };
  }
}
