// Собирает src/**/*.js (ES-модули) в один инлайновый <script> внутри index.html,
// чтобы игра открывалась двойным кликом по файлу (file://) без локального сервера —
// браузеры блокируют fetch ES-модулей с file://, но не обычные инлайновые скрипты.
//
// Запуск: node tools/build.mjs
// Источник правды — файлы в src/*.js. После правки любого из них нужно запускать
// эту команду заново, чтобы обновить index.html.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');

function walk(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walk(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function toKey(absPath) {
  return path.relative(srcDir, absPath).split(path.sep).join('/');
}

function resolveSpecifier(fromKey, specifier) {
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fromKey), specifier));
  return resolved;
}

const files = walk(srcDir);
const modules = new Map(); // key -> { raw, key }
for (const f of files) {
  const key = toKey(f);
  modules.set(key, { key, raw: fs.readFileSync(f, 'utf8') });
}

const STATIC_IMPORT_RE = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/g;
const DYNAMIC_IMPORT_RE = /import\(\s*['"]([^'"]+)['"]\s*\)\.then\(\(\{\s*([^}]+)\}\)\s*=>\s*\{/g;
const EXPORT_RE = /export\s+(?:(async)\s+)?(class|const|function)\s+(\w+)/g;

function parseNames(list) {
  return list.split(',').map((s) => s.trim()).filter(Boolean).map((entry) => {
    const m = entry.match(/^(\w+)\s+as\s+(\w+)$/);
    return m ? { imported: m[1], local: m[2] } : { imported: entry, local: entry };
  });
}

function transform(mod) {
  const deps = [];
  let code = mod.raw;

  // Динамический import().then(({X}) => { ... — переписываем на синхронный доступ
  // к уже собранному модулю (в бандле нет отдельных чанков, всё уже загружено).
  code = code.replace(DYNAMIC_IMPORT_RE, (_m, specifier, names) => {
    const depKey = resolveSpecifier(mod.key, specifier);
    deps.push(depKey);
    const destructure = parseNames(names).map((n) => (n.imported === n.local ? n.imported : `${n.imported}: ${n.local}`)).join(', ');
    return `Promise.resolve().then(() => { const { ${destructure} } = __mod[${JSON.stringify(depKey)}];`;
  });

  const importLines = [];
  code = code.replace(STATIC_IMPORT_RE, (_m, names, specifier) => {
    const depKey = resolveSpecifier(mod.key, specifier);
    deps.push(depKey);
    const destructure = parseNames(names).map((n) => (n.imported === n.local ? n.imported : `${n.imported}: ${n.local}`)).join(', ');
    importLines.push(`const { ${destructure} } = __mod[${JSON.stringify(depKey)}];`);
    return '';
  });

  const exportNames = [];
  code = code.replace(EXPORT_RE, (_m, _async, _kind, name) => {
    exportNames.push(name);
    return _m.replace('export ', '');
  });

  return { key: mod.key, code, deps, exportNames, importLines };
}

const transformed = new Map();
for (const mod of modules.values()) transformed.set(mod.key, transform(mod));

// main.js — единственный не-модуль (ничего его не импортирует), точка входа.
const MAIN_KEY = 'main.js';

const visited = new Set();
const order = [];
function visit(key) {
  if (visited.has(key)) return;
  visited.add(key);
  const mod = transformed.get(key);
  if (!mod) throw new Error(`Модуль не найден: ${key}`);
  for (const dep of mod.deps) visit(dep);
  if (key !== MAIN_KEY) order.push(key);
}
for (const key of transformed.keys()) if (key !== MAIN_KEY) visit(key);
visit(MAIN_KEY);

const parts = ['"use strict";', 'const __mod = {};', ''];
for (const key of order) {
  if (key === MAIN_KEY) continue;
  const mod = transformed.get(key);
  parts.push(`__mod[${JSON.stringify(key)}] = (function () {`);
  parts.push(mod.importLines.join('\n'));
  parts.push(mod.code);
  parts.push(`  return { ${mod.exportNames.join(', ')} };`);
  parts.push('})();');
  parts.push('');
}

const mainMod = transformed.get(MAIN_KEY);
parts.push('(function () {');
parts.push(mainMod.importLines.join('\n'));
parts.push(mainMod.code);
parts.push('})();');

const bundle = parts.join('\n');

const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const scriptTagRe = /<script[^>]*src=["']src\/main\.js["'][^>]*><\/script>|<script>[\s\S]*?<\/script>\s*<!--__MSCVOYAGE_BUNDLE__-->/;
const replacement = `<script>\n${bundle}\n</script><!--__MSCVOYAGE_BUNDLE__-->`;

if (!scriptTagRe.test(html)) {
  throw new Error('Не нашла в index.html тег для замены (ни <script type="module" src="src/main.js">, ни ранее собранный бандл).');
}
// Функция-замена, а не строка: код бандла может содержать "$'"/"$&" и т.п. —
// в строке-замене .replace() это спецпоследовательности, ломающие вставку.
html = html.replace(scriptTagRe, () => replacement);
fs.writeFileSync(indexPath, html, 'utf8');

console.log(`Собрано ${order.length} модулей -> index.html (${(bundle.length / 1024).toFixed(1)} КБ инлайн-кода).`);
