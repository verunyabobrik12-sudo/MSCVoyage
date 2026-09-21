// Минимальный статический сервер без зависимостей — чтобы open index.html
// работал корректно с ES-модулями (type="module" требует http://, не file://).
// Запускается через start.bat / start.sh, отдельно руками не нужен.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

const server = http.createServer((req, res) => {
  const decodedPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(root, decodedPath === '/' ? 'index.html' : decodedPath);

  // Не выходить за пределы папки проекта.
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Не найдено: ' + decodedPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      // Без этого браузер может отдавать старую версию JSON/JS из кеша
      // после правок на диске, хотя сервер уже раздаёт свежий файл.
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`MSC Voyage: http://localhost:${port}`);
});
