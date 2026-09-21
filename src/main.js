// Точка входа. ВРЕМЕННО два режима, пока идёт переход со старого
// пиксель-артового движка на новый (готовые иллюстрации, см. IllustratedScene):
// ?scene=rome в адресе -> новый движок на одной сцене (тестовый прогон);
// без параметра -> старый рабочий движок (Каюта/Коридор и т.д.), не трогаем,
// пока не все локации переведены. Как только все сцены будут готовы, эта
// развилка и весь блок runLegacyGame() уйдут, а src/main.js станет как
// src/engine/illustratedBootstrap.js.

import { CONFIG } from './data/config.js';
import { Input } from './engine/input.js';
import { SceneManager } from './engine/sceneManager.js';
import { Sound } from './engine/sound.js';
import { TitleScene } from './scenes/TitleScene.js';
import { CabinScene } from './scenes/CabinScene.js';
import { runIllustratedTest } from './engine/illustratedBootstrap.js';

const sceneParam = new URLSearchParams(location.search).get('scene');

if (sceneParam) {
  runIllustratedTest(sceneParam);
} else {
  runLegacyGame();
}

function runLegacyGame() {
  const SCREEN_W = CONFIG.screen.width;
  const SCREEN_H = CONFIG.screen.height;

  // Все сцены рисуют в этот офскрин-канвас в логическом разрешении игры —
  // независимо от экрана/DPR. Он же используется для переноса координат тапов.
  const gameCanvas = document.createElement('canvas');
  gameCanvas.width = SCREEN_W;
  gameCanvas.height = SCREEN_H;
  const ctx = gameCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Видимый канвас в DOM — его битмап-буфер выставляется в РЕАЛЬНЫХ пикселях
  // устройства (CSS-размер × devicePixelRatio), чтобы браузер не растягивал
  // картинку сам и не размывал пиксель-арт на экранах с дробным DPR (125%/150%).
  const canvas = document.getElementById('game-canvas');
  canvas.classList.add('pixelated');
  const displayCtx = canvas.getContext('2d');
  let midCanvas = null; // переиспользуемый промежуточный канвас для дробного масштаба

  function resize() {
    const wrapper = document.getElementById('phone-frame');
    const availW = wrapper.clientWidth;
    const availH = wrapper.clientHeight;
    const cssScale = Math.max(1, Math.floor(Math.min(availW / SCREEN_W, availH / SCREEN_H)));

    const cssW = SCREEN_W * cssScale;
    const cssH = SCREEN_H * cssScale;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const dpr = window.devicePixelRatio || 1;
    const backingW = Math.max(1, Math.round(cssW * dpr));
    const backingH = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== backingW || canvas.height !== backingH) {
      canvas.width = backingW;
      canvas.height = backingH;
    }
  }

  window.addEventListener('resize', resize);
  resize();

  /** Переносит офскрин-канвас на видимый, без блюра при дробном итоговом масштабе. */
  function presentFrame() {
    const backingW = canvas.width;
    const backingH = canvas.height;
    const exactScale = Math.min(backingW / SCREEN_W, backingH / SCREEN_H);
    const intScale = Math.max(1, Math.ceil(exactScale - 0.001));

    displayCtx.imageSmoothingEnabled = false;
    displayCtx.clearRect(0, 0, backingW, backingH);

    if (Math.abs(intScale - exactScale) < 0.01) {
      // Целочисленный масштаб — рисуем напрямую, без промежуточного шага.
      const w = SCREEN_W * intScale;
      const h = SCREEN_H * intScale;
      const dx = Math.round((backingW - w) / 2);
      const dy = Math.round((backingH - h) / 2);
      displayCtx.drawImage(gameCanvas, 0, 0, SCREEN_W, SCREEN_H, dx, dy, w, h);
    } else {
      // Дробный масштаб (обычно из-за нецелого devicePixelRatio): сперва рисуем
      // в целочисленном разрешении на промежуточный канвас (пиксели остаются
      // ровными), затем плавно уменьшаем его до точного размера — так итог
      // выглядит чётче, чем растягивание "рваным" дробным шагом.
      if (!midCanvas) midCanvas = document.createElement('canvas');
      const midW = SCREEN_W * intScale;
      const midH = SCREEN_H * intScale;
      if (midCanvas.width !== midW || midCanvas.height !== midH) {
        midCanvas.width = midW;
        midCanvas.height = midH;
      }
      const midCtx = midCanvas.getContext('2d');
      midCtx.imageSmoothingEnabled = false;
      // gameCanvas прозрачен за пределами отрисованной комнаты (там, где комната
      // меньше экрана) — без очистки эти пиксели не перекрывают предыдущий кадр
      // в midCanvas, и там годами "застревает" старое положение камеры/комнаты.
      midCtx.clearRect(0, 0, midW, midH);
      midCtx.drawImage(gameCanvas, 0, 0, SCREEN_W, SCREEN_H, 0, 0, midW, midH);

      const w = Math.round(SCREEN_W * exactScale);
      const h = Math.round(SCREEN_H * exactScale);
      const dx = Math.round((backingW - w) / 2);
      const dy = Math.round((backingH - h) / 2);
      displayCtx.imageSmoothingEnabled = true;
      displayCtx.drawImage(midCanvas, 0, 0, midW, midH, dx, dy, w, h);
    }
  }

  function toLogicalCoords(cssX, cssY, rect) {
    const x = (cssX / rect.width) * SCREEN_W;
    const y = (cssY / rect.height) * SCREEN_H;
    if (x < 0 || y < 0 || x > SCREEN_W || y > SCREEN_H) return null;
    return { x, y };
  }

  const input = new Input(canvas, toLogicalCoords);
  input.onFirstGesture = () => Sound.unlock();

  const sceneManager = new SceneManager();

  const game = {
    input,
    sceneManager,
    startVoyage() {
      sceneManager.goto(new CabinScene(game));
    },
  };

  sceneManager.setInitial(new TitleScene({ game }));
  window.__game = game; // временный хук для отладки в консоли, убрать перед релизом

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

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000); // защита от рывков при сворачивании вкладки
    lastTime = now;

    sceneManager.update(dt, input);
    ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
    sceneManager.draw(ctx, SCREEN_W, SCREEN_H);
    presentFrame();
    input.endFrame();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
