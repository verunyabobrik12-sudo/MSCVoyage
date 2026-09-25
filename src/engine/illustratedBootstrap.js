// Точка входа нового движка (готовые иллюстрации). Два режима:
//   runGame()            — полный игровой цикл: титул -> обучение -> HUD ->
//                           сцены с настоящими переходами по дверям. Это то,
//                           что видит игрок (index.html без ?scene=).
//   runIllustratedTest() — одна сцена без титула/HUD, только мир + DOM-окна
//                          "Да/Нет"/факт — используется для QA разметки
//                          конкретной локации (?scene=rome и т.п.).

import { IllustratedScene } from './illustratedScene.js';
import { Input } from './input.js';
import { Sound } from './sound.js';
import { Storage } from './storage.js';
import { CONFIG } from '../data/config.js';
import { STRINGS } from '../data/strings.ru.js';
import { loadThemeFont, injectDesignSystem } from '../ui/theme.js';
import { createDialogAdapter } from '../ui/dialogAdapter.js';
import { createHud } from '../ui/hud.js';
import { createTitleScreen } from '../ui/titleScreen.js';
import { createOnboarding } from '../ui/onboarding.js';
import { openMenu } from '../ui/menu.js';
import { openQuiz } from '../ui/quizScreen.js';
import { openMinigame } from '../ui/minigameScreen.js';
import { openPostcards } from '../ui/postcardsScreen.js';
import { openFinale } from '../ui/finaleScreen.js';
import { openMap } from '../ui/mapScreen.js';
import { createToastLayer, createPanel, createButton, createModal } from '../ui/components.js';
import { QUIZZES } from '../data/quizzes.js';
import { MINIGAMES } from '../data/minigames.js';

const KNOWN_SCENES = new Set(['cabin', 'corridor', 'restaurant', 'pool', 'rome']);

// Какой hotspot какую викторину открывает и какую открытку выдаёт за неё
// (раздел 3.9 — открытки пока только для точек, у которых реально есть
// готовая викторина; остальные 5 открыток появятся вместе с их точками).
const HOTSPOT_QUIZ = {
  quizCruises: { quizId: 'msc', postcardId: 'cabin' },
  quizRome: { quizId: 'rome', postcardId: 'rome' },
};

// Метка времени в URL каждой сцены/ассета — пока идёт активная правка данных
// (JSON и картинки грузятся через fetch()/Image.src, а не как ES-модули,
// сборщик их не трогает и заголовки сервера браузер иногда игнорирует для
// уже закешированной ранее копии). Без этого поправленный *.json может не
// долетать до браузера даже после перезапуска сервера.
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

async function loadHero() {
  const heroMeta = await loadJson('assets/sprites/hero_girl.json');
  const heroSheet = await loadImage(`assets/sprites/${heroMeta.file}`);
  const heroPortrait = {
    sheetSrc: withCacheBust(`assets/sprites/${heroMeta.file}`),
    frameWidth: heroMeta.frameWidth,
    frameHeight: heroMeta.frameHeight,
    sheetWidth: heroMeta.frameWidth * heroMeta.framesPerRow,
    sheetHeight: heroMeta.frameHeight * heroMeta.rows,
    frameX: 0,
    frameY: heroMeta.directions.down * heroMeta.frameHeight,
  };
  return { heroMeta, heroSheet, heroPortrait };
}

/** Общий цикл рендера/ресайза для canvas нового движка (без целочисленного шага — не пиксель-арт). */
function setupCanvasLoop({ canvas, ctx, phoneFrame, onResize, onFrame }) {
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
    onResize(cssW, cssH);
  }
  window.addEventListener('resize', resize);
  resize();

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    onFrame(dt, cssW, cssH);
    ctx.restore();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return { getSize: () => ({ cssW, cssH }) };
}

// ============================================================================
// QA одной сцены — ?scene=имя
// ============================================================================
export async function runIllustratedTest(sceneName) {
  loadThemeFont();
  injectDesignSystem();

  const [sceneData, { heroMeta, heroSheet }] = await Promise.all([
    loadJson(`src/data/scenes/${sceneName}.json`),
    loadHero(),
  ]);
  const bgImage = await loadImage(sceneData.image);

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const phoneFrame = document.getElementById('phone-frame');
  const uiLayer = document.getElementById('ui-layer');
  uiLayer.classList.add('msc-root');
  const legacyMute = document.getElementById('mute-button');

  const dialogAdapter = createDialogAdapter(uiLayer);
  const completed = new Set();
  const game = {
    isHotspotCompleted: (id) => completed.has(id),
    onHotspotPlay: (item) => {
      // Тестовый режим: реальные викторины/мини-игры подключаются отдельным
      // промтом — здесь просто отмечаем точку пройденной.
      completed.add(item.id);
      Sound.points();
    },
    onSceneDoor: (door) => {
      // eslint-disable-next-line no-console
      console.log('[door] переход в', door.target, '(в тестовом режиме без реального перехода)');
    },
  };

  const scene = new IllustratedScene({ game, sceneData, bgImage, heroSheet, heroMeta, ui: dialogAdapter });
  scene.enter();

  function toLogicalCoords(cssX, cssY) { return { x: cssX, y: cssY }; }
  const input = new Input(canvas, toLogicalCoords);
  input.onFirstGesture = () => Sound.unlock();

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    scene.setCursorScreen(e.clientX - rect.left, e.clientY - rect.top);
  });

  setupCanvasLoop({
    canvas, ctx, phoneFrame,
    onResize: (cssW, cssH) => {
      const sceneScale = Math.min(cssW / sceneData.size[0], cssH / sceneData.size[1]);
      const drawW = sceneData.size[0] * sceneScale;
      const drawH = sceneData.size[1] * sceneScale;
      scene.setTransform(sceneScale, (cssW - drawW) / 2, (cssH - drawH) / 2);
    },
    onFrame: (dt, cssW, cssH) => {
      scene.update(dt, input);
      scene.draw(ctx, cssW, cssH);
      input.endFrame();
    },
  });

  function updateMuteButton() { legacyMute.textContent = Sound.isMuted() ? '🔇' : '🔊'; }
  legacyMute.addEventListener('click', () => { Sound.unlock(); Sound.toggleMute(); updateMuteButton(); });
  updateMuteButton();

  window.__game = { scene, input, Storage };
}

// ============================================================================
// Полный игровой цикл — титул -> обучение -> HUD -> сцены
// ============================================================================
export async function runGame() {
  loadThemeFont();
  injectDesignSystem();

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const phoneFrame = document.getElementById('phone-frame');
  const uiLayer = document.getElementById('ui-layer');
  uiLayer.classList.add('msc-root');
  const legacyMute = document.getElementById('mute-button');
  legacyMute.style.display = 'none'; // новый флоу рисует свою кнопку звука

  const { heroMeta, heroSheet, heroPortrait } = await loadHero();
  let hud = null;
  const dialogAdapter = createDialogAdapter(uiLayer, {
    onOpen: () => hud?.setDimmed(true),
    onClose: () => hud?.setDimmed(false),
  });
  const toastLayer = createToastLayer(uiLayer);
  toastLayer.el.classList.add('msc-root');

  const sceneCache = new Map();
  async function loadScene(name) {
    if (sceneCache.has(name)) return sceneCache.get(name);
    const sceneData = await loadJson(`src/data/scenes/${name}.json`);
    const bgImage = await loadImage(sceneData.image);
    const entry = { sceneData, bgImage };
    sceneCache.set(name, entry);
    return entry;
  }

  let scene = null;
  let input = null;
  let resizeToScene = () => {};

  function computeProgress() {
    const s = Storage.get();
    const done = Object.keys(s.completedQuizzes).length + Object.keys(s.completedMinigames).length;
    return Math.min(100, (done / CONFIG.illustrated.totalActivities) * 100);
  }

  // Модальные экраны поверх сцены: мир на паузе, HUD приглушён.
  function withPausedWorld(open) {
    if (scene) scene.blocked = true;
    hud?.setDimmed(true);
    open(() => { if (scene) scene.blocked = false; hud?.setDimmed(false); });
  }
  function showPostcards() {
    withPausedWorld((resume) => openPostcards({ container: uiLayer, onFinale: showFinale, onClose: resume }));
  }
  function showFinale() {
    Storage.set({ finaleSeen: true });
    withPausedWorld((resume) => openFinale({ container: uiLayer, onPostcards: showPostcards, onClose: resume }));
  }
  // Карта: только разметка сцен (без 9-мегабайтных фонов) + прогресс заданий.
  const MAP_GROUPS = [
    { title: 'На борту лайнера', ids: ['cabin', 'corridor', 'restaurant', 'pool'] },
    { title: 'На берегу', ids: ['rome'] },
  ];
  async function showMap() {
    const datas = await Promise.all(MAP_GROUPS.flatMap((g) => g.ids).map((id) => loadJson(`src/data/scenes/${id}.json`)));
    const byId = Object.fromEntries(datas.map((d) => [d.id, d]));
    const groups = MAP_GROUPS.map((g) => ({
      title: g.title,
      places: g.ids.map((id) => {
        const d = byId[id];
        const hs = d.hotspots || [];
        return {
          id,
          label: d.label,
          thumb: `assets/postcards/${id}.jpg`,
          current: scene?.data.id === id,
          tasks: hs.filter((h) => h.type === 'quiz' || h.type === 'minigame')
            .map((h) => ({ label: h.label, done: gameApi.isHotspotCompleted(h.id) })),
          infoCount: hs.filter((h) => h.type === 'info').length,
        };
      }),
    }));
    withPausedWorld((resume) => openMap({ container: uiLayer, groups, onTravel: travelTo, onClose: resume }));
  }
  async function travelTo(id) {
    const { sceneData, bgImage } = await loadScene(id);
    enterScene(sceneData, bgImage, sceneData.spawn, null);
  }

  /** После каждого задания: все пройдены и финал ещё не показывали — показать. */
  function maybeShowFinale() {
    if (computeProgress() >= 100 && !Storage.get().finaleSeen) showFinale();
  }

  const gameApi = {
    isHotspotCompleted(id) {
      const s = Storage.get();
      const mapping = HOTSPOT_QUIZ[id];
      if (mapping) return !!s.completedQuizzes[mapping.quizId];
      return !!s.completedMinigames[id];
    },
    onHotspotPlay(item) {
      if (item.type === 'quiz') {
        const mapping = HOTSPOT_QUIZ[item.id];
        const quiz = mapping && QUIZZES[mapping.quizId];
        if (!quiz) {
          toastLayer.show('Эта викторина появится позже', { iconName: 'info' });
          return;
        }
        // Диалог "Сыграть?" уже снял блокировку сцены (см. IllustratedScene._resolveDialog) —
        // пока открыт сам экран викторины, мир должен оставаться на паузе.
        scene.blocked = true;
        hud?.setDimmed(true);
        openQuiz({
          container: uiLayer,
          quiz,
          postcardId: mapping.postcardId,
          pointsBadgeEl: hud?.pointsBadge,
          onPointsChanged: (n) => { hud?.setPoints(n); hud?.setProgress(computeProgress()); },
          onFinish: () => { scene.blocked = false; hud?.setDimmed(false); maybeShowFinale(); },
        });
        return;
      }
      if (item.type === 'minigame') {
        const game = MINIGAMES[item.id];
        if (!game) {
          toastLayer.show('Эта игра появится позже', { iconName: 'info' });
          return;
        }
        scene.blocked = true;
        hud?.setDimmed(true);
        openMinigame({
          container: uiLayer,
          game,
          pointsBadgeEl: hud?.pointsBadge,
          onPointsChanged: (n) => { hud?.setPoints(n); hud?.setProgress(computeProgress()); },
          onFinish: () => { scene.blocked = false; hud?.setDimmed(false); maybeShowFinale(); },
        });
      }
    },
    async onSceneDoor(door) {
      if (!KNOWN_SCENES.has(door.target)) {
        toastLayer.show('Этот переход появится позже', { iconName: 'info' });
        return;
      }
      const { sceneData, bgImage } = await loadScene(door.target);
      const reverseDoor = (sceneData.doors || []).find((d) => d.target === scene.data.id);
      const spawnAt = reverseDoor ? reverseDoor.spawnAt : sceneData.spawn;
      const entryDoorId = reverseDoor ? reverseDoor.id : null;
      enterScene(sceneData, bgImage, spawnAt, entryDoorId);
    },
  };

  function enterScene(sceneData, bgImage, spawnPoint, entryDoorId) {
    scene = new IllustratedScene({ game: gameApi, sceneData, bgImage, heroSheet, heroMeta, ui: dialogAdapter });
    scene.enter(spawnPoint, entryDoorId);
    resizeToScene();
    Storage.set({ currentSceneId: sceneData.id });
    hud?.setGoal(STRINGS.goals[sceneData.id] || sceneData.label, 'info');
  }

  function toLogicalCoords(cssX, cssY) { return { x: cssX, y: cssY }; }

  function startCanvasLoop() {
    input = new Input(canvas, toLogicalCoords);
    input.onFirstGesture = () => Sound.unlock();
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      scene?.setCursorScreen(e.clientX - rect.left, e.clientY - rect.top);
    });

    setupCanvasLoop({
      canvas, ctx, phoneFrame,
      onResize: (cssW, cssH) => {
        resizeToScene = () => {
          if (!scene) return;
          const sceneScale = Math.min(cssW / scene.data.size[0], cssH / scene.data.size[1]);
          const drawW = scene.data.size[0] * sceneScale;
          const drawH = scene.data.size[1] * sceneScale;
          scene.setTransform(sceneScale, (cssW - drawW) / 2, (cssH - drawH) / 2);
        };
        resizeToScene();
      },
      onFrame: (dt, cssW, cssH) => {
        if (!scene) return;
        scene.update(dt, input);
        scene.draw(ctx, cssW, cssH);
        input.endFrame();
      },
    });
  }

  async function beginPlaying() {
    const startId = KNOWN_SCENES.has(Storage.get().currentSceneId) ? Storage.get().currentSceneId : 'cabin';
    const { sceneData, bgImage } = await loadScene(startId);
    startCanvasLoop();
    enterScene(sceneData, bgImage, sceneData.spawn, null);

    hud = createHud({
      container: uiLayer,
      heroPortrait,
      points: Storage.get().points,
      progressPercent: computeProgress(),
      muted: Sound.isMuted(),
      onOpenMap: () => showMap(),
      onOpenPostcards: () => showPostcards(),
      onOpenShop: () => toastLayer.show('Магазин появится в следующем шаге', { iconName: 'shop' }),
      onToggleSound: () => { Sound.unlock(); Sound.toggleMute(); hud.setMuted(Sound.isMuted()); },
      onOpenMenu: () => {
        hud.setDimmed(true);
        openMenu({
          container: uiLayer,
          muted: Sound.isMuted(),
          onToggleSound: () => { Sound.unlock(); Sound.toggleMute(); hud.setMuted(Sound.isMuted()); },
          onHowToPlay: () => showOnboarding(),
          onNewGame: () => { Storage.reset(); teardownGame(); showTitle(); },
          onMainMenu: () => { teardownGame(); showTitle(); },
          onClose: () => hud.setDimmed(false),
        });
      },
    });
    hud.setGoal(STRINGS.goals[startId] || sceneData.label, 'info');
  }

  function teardownGame() {
    hud?.setVisible(false);
    hud?.el.remove();
    hud = null;
    scene = null;
  }

  function showOnboarding() {
    createOnboarding({
      container: uiLayer,
      heroPortrait,
      onDone: () => { Storage.set({ tutorialSeen: true }); },
    });
  }

  function showTitle() {
    const title = createTitleScreen({
      container: uiLayer,
      hasSave: Storage.get().tutorialSeen,
      muted: Sound.isMuted(),
      onToggleSound: () => { Sound.unlock(); Sound.toggleMute(); title.setMuted(Sound.isMuted()); },
      onPlay: async () => {
        title.remove();
        if (!Storage.get().tutorialSeen) {
          await new Promise((resolve) => {
            createOnboarding({ container: uiLayer, heroPortrait, onDone: () => { Storage.set({ tutorialSeen: true }); resolve(); } });
          });
        }
        beginPlaying();
      },
      onNewGame: () => {
        confirmCentered(uiLayer, STRINGS.menu.newGameConfirm).then((yes) => {
          if (!yes) return;
          Storage.reset();
          title.remove();
          showTitle();
        });
      },
      onHowToPlay: () => showOnboarding(),
    });
  }

  showTitle();
  window.__game = { Storage, get scene() { return scene; }, get hud() { return hud; } };
}

/** Небольшое центрированное окно "Да/Нет" вне мира — для титульного экрана. */
function confirmCentered(container, message) {
  return new Promise((resolve) => {
    const { el: panel, body } = createPanel();
    const p = document.createElement('p');
    p.className = 'msc-dialog-text';
    p.textContent = message;
    body.appendChild(p);
    const actions = document.createElement('div');
    actions.className = 'msc-dialog-actions';
    const yes = createButton({ label: STRINGS.doors.yes, variant: 'red' });
    const no = createButton({ label: STRINGS.doors.no, variant: 'green' });
    actions.appendChild(yes.el);
    actions.appendChild(no.el);
    body.appendChild(actions);
    const modal = createModal({ bodyEl: panel, container, onRequestClose: () => finish(false) });
    let settled = false;
    function finish(v) { if (settled) return; settled = true; modal.close(); resolve(v); }
    yes.button.addEventListener('click', () => finish(true));
    no.button.addEventListener('click', () => finish(false));
    modal.open();
  });
}
