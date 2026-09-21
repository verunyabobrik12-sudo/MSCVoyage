// Автоматическая проверка разметки сцен (раздел 10/12 ТЗ этапа 1):
// для каждой сцены проверяет достижимость spawn, дверей и всех hotspot-триггеров
// заливкой по сетке проходимости (не на глаз по скриншоту), находит недоступные
// "острова", и сохраняет картинку маски в tests/masks/<имя>.png.
//
// Запуск: node tools/check_scenes.js [имя_сцены ...]   (без аргументов — все сцены)

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { CollisionGrid, findScenePath } from '../src/engine/collisionGrid.js';
import { pointInTrigger } from '../src/engine/polygon.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scenesDir = path.join(root, 'src', 'data', 'scenes');
const masksDir = path.join(root, 'tests', 'masks');

function loadScene(name) {
  const file = path.join(scenesDir, `${name}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Находит проходимую (с учётом хитбокса) клетку сетки, центр которой лежит внутри триггера. */
function findWalkablePointInTrigger(grid, trigger) {
  const step = grid.step;
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (!grid.cellWalkable(col, row)) continue;
      const { x, y } = grid.toWorld(col, row);
      if (pointInTrigger(x, y, trigger)) return { x, y };
    }
  }
  return null;
}

function checkScene(name) {
  const data = loadScene(name);
  const grid = new CollisionGrid(data);
  const report = { scene: name, ok: true, issues: [] };

  const [sx, sy] = data.spawn;
  if (!grid.isWalkable(sx, sy)) {
    report.ok = false;
    report.issues.push(`spawn (${sx},${sy}) непроходим сам по себе`);
  }

  const targets = [];
  for (const h of data.hotspots || []) targets.push({ kind: 'hotspot', id: h.id, trigger: h.trigger });
  for (const d of data.doors || []) {
    targets.push({ kind: 'door', id: d.id, trigger: d.trigger });
    if (d.spawnAt && !grid.isWalkable(d.spawnAt[0], d.spawnAt[1])) {
      report.ok = false;
      report.issues.push(`door ${d.id}: spawnAt (${d.spawnAt}) непроходима`);
    }
  }

  for (const t of targets) {
    const point = findWalkablePointInTrigger(grid, t.trigger);
    if (!point) {
      report.ok = false;
      report.issues.push(`${t.kind} ${t.id}: внутри триггера НЕТ ни одной проходимой точки (недостижимо в принципе)`);
      continue;
    }
    const path = findScenePath(grid, sx, sy, point.x, point.y);
    if (!path) {
      report.ok = false;
      report.issues.push(`${t.kind} ${t.id}: точка (${point.x.toFixed(0)},${point.y.toFixed(0)}) внутри триггера проходима, но ПУТЬ от spawn до неё не строится (изолированный остров)`);
    }
  }

  // Достижимость "от каждой точки до каждой" — чтобы отдельно поймать острова,
  // не связанные даже друг с другом (не только со spawn).
  const reachableFromSpawn = floodFillReachable(grid, sx, sy);
  const totalWalkable = countWalkable(grid);
  report.walkableCells = totalWalkable;
  report.reachableFromSpawnCells = reachableFromSpawn.size;
  if (totalWalkable > 0 && reachableFromSpawn.size < totalWalkable) {
    const unreachablePct = (100 * (totalWalkable - reachableFromSpawn.size) / totalWalkable).toFixed(1);
    report.issues.push(`есть проходимые клетки (${totalWalkable - reachableFromSpawn.size} из ${totalWalkable}, ${unreachablePct}%), НЕ связанные со spawn — вероятный изолированный остров`);
    report.ok = false;
  }

  saveMask(name, grid, reachableFromSpawn, data);
  return report;
}

function floodFillReachable(grid, sx, sy) {
  const start = grid.toGrid(sx, sy);
  const visited = new Set();
  if (!grid.cellWalkable(start.col, start.row)) return visited;
  const stack = [[start.col, start.row]];
  visited.add(`${start.col},${start.row}`);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (stack.length) {
    const [c, r] = stack.pop();
    for (const [dc, dr] of dirs) {
      const nc = c + dc, nr = r + dr;
      const k = `${nc},${nr}`;
      if (visited.has(k)) continue;
      if (!grid.cellWalkable(nc, nr)) continue;
      visited.add(k);
      stack.push([nc, nr]);
    }
  }
  return visited;
}

function countWalkable(grid) {
  let n = 0;
  for (let i = 0; i < grid.grid.length; i++) if (grid.grid[i] === 1) n++;
  return n;
}

// --- минимальный PNG-энкодер (grayscale + отметки), без внешних зависимостей ---
function writePng(filePath, width, height, rgbaBuffer) {
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeData), 0);
    return Buffer.concat([len, typeData, crc]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgbaBuffer.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = zlib.deflateSync(raw);

  const png = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, png);
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function saveMask(name, grid, reachableFromSpawn, data) {
  const scale = 2; // маска рисуется в масштабе шага сетки (каждая клетка = quad из scale x scale px)
  const w = grid.cols * scale;
  const h = grid.rows * scale;
  const buf = Buffer.alloc(w * h * 4);

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const walkable = grid.cellWalkable(col, row);
      const reachable = reachableFromSpawn.has(`${col},${row}`);
      let r, g, b;
      if (!walkable) { r = 40; g = 20; b = 15; } // тёмно-коричневый — запрещено
      else if (reachable) { r = 60; g = 200; b = 90; } // зелёный — проходимо и достижимо
      else { r = 230; g = 40; b = 40; } // красный — проходимо, но НЕ достижимо (остров/баг)
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = col * scale + sx;
          const py = row * scale + sy;
          const idx = (py * w + px) * 4;
          buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
        }
      }
    }
  }

  // отмечаем маркеры точек/дверей белыми крестами для наглядности
  function markCross(x, y, color) {
    const cx = Math.round((x / grid.step) * scale);
    const cy = Math.round((y / grid.step) * scale);
    for (let d = -6; d <= 6; d++) {
      for (const [px, py] of [[cx + d, cy], [cx, cy + d]]) {
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const idx = (py * w + px) * 4;
        buf[idx] = color[0]; buf[idx + 1] = color[1]; buf[idx + 2] = color[2]; buf[idx + 3] = 255;
      }
    }
  }
  for (const hSpot of data.hotspots || []) markCross(hSpot.marker[0], hSpot.marker[1], [255, 255, 255]);
  for (const d of data.doors || []) markCross(d.marker[0], d.marker[1], [255, 215, 60]);
  markCross(data.spawn[0], data.spawn[1], [40, 140, 255]);

  writePng(path.join(masksDir, `${name}.png`), w, h, buf);
}

const argScenes = process.argv.slice(2);
const allScenes = fs.readdirSync(scenesDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
const scenesToCheck = argScenes.length ? argScenes : allScenes;

let allOk = true;
for (const name of scenesToCheck) {
  const report = checkScene(name);
  console.log(`\n=== ${name} === ${report.ok ? 'OK' : 'ЕСТЬ ПРОБЛЕМЫ'}`);
  console.log(`проходимых клеток: ${report.walkableCells}, достижимо от spawn: ${report.reachableFromSpawnCells}`);
  for (const issue of report.issues) console.log(`  - ${issue}`);
  if (!report.ok) allOk = false;
}

console.log(`\nМаски сохранены в tests/masks/. Итог: ${allOk ? 'все сцены прошли проверку' : 'ЕСТЬ НЕПРОЙДЕННЫЕ ПРОВЕРКИ'}`);
process.exit(allOk ? 0 : 1);
