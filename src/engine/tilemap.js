// Простая сетка коллизий для локации. Тайл — 16×16 логических пикселей.

export const TILE_SIZE = 16;

export class TileMap {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.width = cols * TILE_SIZE;
    this.height = rows * TILE_SIZE;
    this.solid = new Uint8Array(cols * rows); // 1 = стена/мебель, непроходимо
  }

  index(col, row) {
    return row * this.cols + col;
  }

  inBounds(col, row) {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows;
  }

  isWalkable(col, row) {
    if (!this.inBounds(col, row)) return false;
    return this.solid[this.index(col, row)] === 0;
  }

  setSolid(col, row, value = 1) {
    if (!this.inBounds(col, row)) return;
    this.solid[this.index(col, row)] = value;
  }

  /** Помечает прямоугольную область (в тайлах) как непроходимую — удобно для мебели. */
  setSolidRect(col, row, w, h, value = 1) {
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        this.setSolid(c, r, value);
      }
    }
  }

  worldToGrid(x, y) {
    return { col: Math.floor(x / TILE_SIZE), row: Math.floor(y / TILE_SIZE) };
  }

  gridToWorldCenter(col, row) {
    return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
  }

  /** Проверка коллизии точки-персонажа (с небольшим радиусом) в мировых координатах. */
  isPointWalkable(x, y, radius = 5) {
    const points = [
      [x - radius, y - radius],
      [x + radius, y - radius],
      [x - radius, y + radius],
      [x + radius, y + radius],
    ];
    return points.every(([px, py]) => {
      const { col, row } = this.worldToGrid(px, py);
      return this.isWalkable(col, row);
    });
  }
}
