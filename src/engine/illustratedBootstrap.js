// Временный тестовый запуск нового движка (готовые иллюстрации) для одной
// сцены — используется, пока не все локации переведены со старого
// пиксель-артового движка. Активируется через ?scene=rome в адресе.
// Как только все сцены будут готовы, это заменит src/main.js целиком.

import { IllustratedScene } from './illustratedScene.js';
import { Input } from './input.js';
import { Sound } from './sound.js';
import { Storage } from './storage.js';
import { loadThemeFont } from '../ui/theme.js';

// Метка времени в URL каждой сцены/ассета — пока идёт активная правка данных
// (JSON и картинки грузятся через fetch()/Image.src, а не как ES-модули,
// сборщик их не трогает и заголовки сервера браузер иногда игнорирует для
// уже закешированной ранее копии). Без этого поправленный rome.json может
// не долетать до браузера даже после перезапуска сервера.
const CACHE_BUST = `v=${Date.now()}`;
function withCacheBust(src) {
  return src + (src.includes('?') ? '&' : '?') + CACHE_BUST;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = withCacheBust(src);
  });
}

function loadJson(src) {
  return fetch(withCacheBust(src)).then((r) => r.json());
}

export async function runIllustratedTest(sceneName) {
  loadThemeFont();

  const [sceneData, heroMeta] = await Promise.all([
    loadJson(`src/data/scenes/${sceneName}.json`),
    loadJson('assets/sprites/hero_girl.json'),
  ]);
  const [bgImage, heroSheet] = await Promise.all([
    loadImage(sceneData.image),
    loadImage(`assets/sprites/${heroMeta.file}`),
  ]);

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const phoneFrame = document.getElementById('phone-frame');

  const completed = new Set();
  const game = {
    isHotspotCompleted: (id) => completed.has(id),
    onHotspotPlay: (item) => {
      // Тестовый режим: реальные викторины/мини-игры подключаются отдельным
      // промтом — здесь просто отмечаем точку пройденной, чтобы видеть
      // зелёную галочку и повторный "разряд" триггера.
      completed.add(item.id);
      Sound.points();
    },
    onSceneDoor: (door) => {
      // eslint-disable-next-line no-console
      console.log('[door] переход в', door.target, '(в тестовом режиме без реального перехода)');
    },
  };

  const scene = new IllustratedScene({ game, sceneData, bgImage, heroSheet, heroMeta });
  scene.enter();

  let dpr = window.devicePixelRatio || 1;
  let cssW = 0;
  let cssH = 0;

  function resize() {
    const availW = phoneFrame.clientWidth;
    const availH = phoneFrame.clientHeight;
    cssW = availW;
    cssH = availH;
    dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));

    const sceneScale = Math.min(cssW / sceneData.size[0], cssH / sceneData.size[1]);
    const drawW = sceneData.size[0] * sceneScale;
    const drawH = sceneData.size[1] * sceneScale;
    const offsetX = (cssW - drawW) / 2;
    const offsetY = (cssH - drawH) / 2;
    scene.setTransform(sceneScale, offsetX, offsetY);
  }
  window.addEventListener('resize', resize);
  resize();

  function toLogicalCoords(cssX, cssY) {
    return { x: cssX, y: cssY };
  }
  const input = new Input(canvas, toLogicalCoords);
  input.onFirstGesture = () => Sound.unlock();

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    scene.setCursorScreen(e.clientX - rect.left, e.clientY - rect.top);
  });

  const muteButton = document.getElementById('mute-button');
  function updateMuteButton() {
    muteButton.textContent = Sound.isMuted() ? '🔇' : '🔊';
  }
  muteButton.addEventListener('click', () => {
    Sound.unlock();
    Sound.toggleMute();
    updateMuteButton();
  });
  updateMuteButton();

  window.__game = { scene, input, Storage };

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    scene.update(dt, input);
    scene.draw(ctx, cssW, cssH);

    ctx.restore();
    input.endFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
