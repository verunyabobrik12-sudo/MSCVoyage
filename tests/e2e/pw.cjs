// Общее для e2e-тестов: где взять Playwright и браузер. В проекте нет npm —
// берём библиотеку из кэша npx (её ставит MCP-сервер playwright) и уже
// скачанный Chromium. Пути можно переопределить переменными окружения.
const path = require('path');
const os = require('os');

const LOCAL = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const PW_PATH = process.env.PW_PATH || path.join(LOCAL, 'npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright');
const CHROME = process.env.PW_CHROME || path.join(LOCAL, 'ms-playwright/chromium-1243/chrome-win64/chrome.exe');

const { chromium } = require(PW_PATH);
module.exports = {
  chromium,
  launch: () => chromium.launch({ executablePath: CHROME }),
  URL: process.env.GAME_URL || 'http://localhost:8080/',
  OUT: process.env.E2E_OUT || path.join(os.tmpdir(), 'mscvoyage-e2e'),
};
