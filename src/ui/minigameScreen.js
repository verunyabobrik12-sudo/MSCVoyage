// Общий каркас экранов мини-игр (раздел 3.6 ТЗ этапа 2): правила -> отсчёт ->
// HUD с паузой -> результат. Сам геймплей каждой игры — в src/minigames/*,
// подключается через GAMEPLAY.
// Структура и приёмы (единый modal + перерисовка stage, подтверждение выхода,
// летящие монеты) — по образцу src/ui/quizScreen.js, только без вопросов.

import {
  createPanel, createRibbon, createButton, createModal, createCloseButton,
  createProgressBar, createStarRow, createHeartsRow, flyCoinsTo, spawnConfetti,
} from './components.js';
import { icon } from './icons.js';
import { STRINGS } from '../data/strings.ru.js';
import { CONFIG } from '../data/config.js';
import { Storage } from '../engine/storage.js';
import { Sound } from '../engine/sound.js';
import { createCatchFood, preloadCatchFood } from '../minigames/catchFood.js';
import { createBallGame, preloadBallGame } from '../minigames/ballGame.js';
import { createRunnerGame, preloadRunnerGame } from '../minigames/runnerGame.js';

const ROUND_SECONDS = 45; // если у игры в данных не задан durationSec

// id игры -> { create, preload }. create монтирует поле в host и возвращает
// { ready, update(dt, progress), resultScore(), destroy() }.
const GAMEPLAY = {
  catchFoodMinigame: { create: createCatchFood, preload: preloadCatchFood },
  ballMinigame: { create: createBallGame, preload: preloadBallGame },
  coinsMinigame: { create: createRunnerGame, preload: preloadRunnerGame },
};

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  return node;
}

/**
 * @param {{container:HTMLElement, game:object, pointsBadgeEl:HTMLElement,
 *          onPointsChanged:(n:number)=>void, onFinish:Function}} opts
 */
export function openMinigame({ container, game, pointsBadgeEl, onPointsChanged, onFinish }) {
  let phase = 'intro'; // intro | countdown | play | pause | result
  let score = 0;
  const gameplayDef = GAMEPLAY[game.id];
  const roundSeconds = game.durationSec ?? ROUND_SECONDS;
  let timeLeft = roundSeconds;
  let gameplay = null; // текущий экземпляр поля (пересоздаётся на "Ещё раз")
  gameplayDef.preload().catch(() => {}); // грузим картинки, пока читают правила
  let rafId = null;
  let lastT = 0;
  let barApi = null;
  let pauseOverlay = null;

  const { el: panel, body } = createPanel({ className: 'msc-minigame-panel' });
  const stage = el('div', 'msc-minigame-stage');
  body.appendChild(stage);
  // Кнопка "✕" — единственная, живёт на уровне панели (не внутри прокручиваемого
  // stage — иначе её намеренный выступ за угол панели раздувает scrollWidth и
  // добавляет лишнюю горизонтальную прокрутку). Поведение зависит от текущей
  // фазы, поэтому логика общая с Esc (onRequestClose) в одной функции.
  panel.appendChild(createCloseButton({ onClick: () => requestClose() }));

  function requestClose() {
    if (phase === 'play') goToPause();
    else if (phase === 'pause') resume();
    else closeAll();
  }

  const modal = createModal({
    bodyEl: panel,
    container,
    full: true,
    onRequestClose: requestClose,
  });

  function destroyGameplay() {
    gameplay?.destroy();
    gameplay = null;
    window.__minigame = null;
  }

  function closeAll() {
    stopLoop();
    destroyGameplay();
    modal.close();
    onFinish?.();
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // --- 1) вводный экран правил ---------------------------------------------
  function renderIntro() {
    phase = 'intro';
    stage.innerHTML = '';
    stage.appendChild(createRibbon(game.title, { wrap: true }));

    const rules = el('div', 'msc-minigame-rules');
    const doRow = el('div', 'msc-minigame-rule msc-minigame-rule--do');
    doRow.appendChild(el('span', 'msc-minigame-rule__icon', { html: icon(game.doIcon) }));
    doRow.appendChild(el('span', 'msc-minigame-rule__text', { text: game.doText }));
    const avoidRow = el('div', 'msc-minigame-rule msc-minigame-rule--avoid');
    avoidRow.appendChild(el('span', 'msc-minigame-rule__icon', { html: icon(game.avoidIcon) }));
    avoidRow.appendChild(el('span', 'msc-minigame-rule__text', { text: game.avoidText }));
    rules.appendChild(doRow);
    rules.appendChild(avoidRow);
    stage.appendChild(rules);

    stage.appendChild(el('p', 'msc-minigame-rules-text', { text: game.rules }));

    const startBtn = createButton({ label: STRINGS.minigame.start, variant: 'green', size: 'l' });
    startBtn.el.classList.add('msc-minigame-cta');
    startBtn.button.addEventListener('click', () => { Sound.click(); renderCountdown(); });
    stage.appendChild(startBtn.el);
    startBtn.button.focus();
  }

  // --- 2) отсчёт 3-2-1 ------------------------------------------------------
  function renderCountdown() {
    phase = 'countdown';
    stage.innerHTML = '';
    stage.appendChild(el('p', 'msc-minigame-countdown-label', { text: STRINGS.minigame.ready }));
    const digit = el('div', 'msc-minigame-countdown-digit msc-outline-text msc-pop', { text: '3' });
    stage.appendChild(digit);

    let n = 3;
    const tick = () => {
      n -= 1;
      digit.classList.remove('msc-pop');
      void digit.offsetWidth; // reflow — перезапускает анимацию на каждой цифре
      digit.classList.add('msc-pop');
      if (n > 0) {
        digit.textContent = String(n);
        Sound.click();
        setTimeout(tick, 700);
      } else {
        digit.textContent = STRINGS.minigame.go;
        digit.classList.add('is-word');
        Sound.correct();
        setTimeout(renderPlay, 550);
      }
    };
    setTimeout(tick, 700);
  }

  // --- 3) игровой HUD + поле игры -------------------------------------------
  function renderPlay() {
    phase = 'play';
    score = 0;
    timeLeft = roundSeconds;
    destroyGameplay();
    stage.innerHTML = '';

    const hud = el('div', 'msc-minigame-hud');
    const scoreBox = el('div', 'msc-minigame-hud__score');
    scoreBox.appendChild(el('span', 'msc-minigame-hud__score-icon', { html: icon('star') }));
    const scoreValue = el('span', 'msc-minigame-hud__score-value', { text: '0' });
    scoreBox.appendChild(scoreValue);
    hud.appendChild(scoreBox);

    const bar = createProgressBar(100);
    barApi = bar;
    const barWrap = el('div', 'msc-minigame-hud__bar');
    barWrap.appendChild(bar.el);
    hud.appendChild(barWrap);

    const hearts = createHeartsRow(game.lives);
    hud.appendChild(hearts.el);

    stage.appendChild(hud);

    const field = el('div', 'msc-minigame-field');
    stage.appendChild(field);
    gameplay = gameplayDef.create({
      host: field,
      lives: game.lives,
      onScore: (n) => { scoreValue.textContent = String(n); Sound.click(); },
      onLives: (n) => { hearts.setLives(n); Sound.wrong(); },
      onGameOver: () => finishRound(),
    });
    window.__minigame = gameplay; // хук для автотестов, как window.__game
    const current = gameplay;
    // таймер стартует, только когда картинки загружены — иначе раунд шёл бы вхолостую
    current.ready.then(() => { if (gameplay === current && phase === 'play') startLoop(); })
      .catch(() => { if (gameplay === current) finishRound(); });
  }

  // Общий тик полосы времени и поля игры, используется и при первом
  // старте раунда, и при возврате из паузы (состояние round не сбрасывается).
  function startLoop() {
    if (rafId) return; // уже крутится (например, resume раньше загрузки картинок)
    lastT = performance.now();
    function frame(t) {
      // max(0): метка кадра rAF бывает чуть раньше performance.now() из startLoop —
      // первый dt отрицательный (в раннере это давало кадр бега с индексом -1)
      const dt = Math.max(0, Math.min(0.05, (t - lastT) / 1000));
      lastT = t;
      timeLeft -= dt;
      barApi.setProgress((Math.max(0, timeLeft) / roundSeconds) * 100);
      gameplay.update(dt, 1 - Math.max(0, timeLeft) / roundSeconds);
      if (phase !== 'play') return; // onGameOver внутри update уже завершил раунд
      if (timeLeft <= 0) { finishRound(); return; }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  function goToPause() {
    if (phase !== 'play') return;
    stopLoop();
    phase = 'pause';
    renderPauseOverlay();
  }

  function renderPauseOverlay() {
    pauseOverlay = el('div', 'msc-minigame-pause-overlay');
    const { el: pPanel, body: pBody } = createPanel({ className: 'msc-minigame-pause-panel' });
    pBody.appendChild(createRibbon(STRINGS.minigame.pauseTitle));

    const list = el('div', 'msc-menu-list');
    const resumeBtn = createButton({ label: STRINGS.minigame.resume, variant: 'green' });
    const soundBtn = createButton({ label: Sound.isMuted() ? STRINGS.menu.soundOff : STRINGS.menu.soundOn, variant: 'blue' });
    const exitBtn = createButton({ label: STRINGS.common.exit, variant: 'red' });
    list.appendChild(resumeBtn.el);
    list.appendChild(soundBtn.el);
    list.appendChild(exitBtn.el);
    pBody.appendChild(list);

    resumeBtn.button.addEventListener('click', () => resume());
    soundBtn.button.addEventListener('click', () => {
      Sound.unlock();
      Sound.toggleMute();
      soundBtn.el.querySelector('.msc-btn__label').textContent = Sound.isMuted() ? STRINGS.menu.soundOff : STRINGS.menu.soundOn;
    });
    exitBtn.button.addEventListener('click', () => {
      if (pPanel.querySelector('.msc-minigame-exit-confirm')) return;
      const box = el('div', 'msc-minigame-exit-confirm');
      box.appendChild(el('p', 'msc-dialog-text', { text: STRINGS.minigame.exitConfirm }));
      const actions = el('div', 'msc-dialog-actions');
      const yes = createButton({ label: STRINGS.common.exit, variant: 'red', size: 's' });
      const no = createButton({ label: STRINGS.common.continue, variant: 'green', size: 's' });
      yes.button.addEventListener('click', () => closeAll());
      no.button.addEventListener('click', () => box.remove());
      actions.appendChild(yes.el);
      actions.appendChild(no.el);
      box.appendChild(actions);
      pBody.appendChild(box);
    });

    pauseOverlay.appendChild(pPanel);
    stage.appendChild(pauseOverlay);
    resumeBtn.button.focus();
  }

  function resume() {
    pauseOverlay?.remove();
    pauseOverlay = null;
    phase = 'play';
    startLoop();
  }

  // --- 4) результат раунда ---------------------------------------------------
  function finishRound() {
    if (phase === 'result') return;
    stopLoop();
    phase = 'result';
    score = gameplay ? gameplay.resultScore() : 0; // 0..100
    destroyGameplay();
    renderResult();
  }

  function renderResult() {
    stage.innerHTML = '';

    const percent = score / 100;
    let stars = 0;
    let headline = STRINGS.minigame.resultTryAgain;
    if (percent >= 0.9) { stars = 3; headline = STRINGS.minigame.resultGreat; }
    else if (percent >= 0.6) { stars = 2; headline = STRINGS.minigame.resultGood; }
    else if (percent > 0) { stars = 1; headline = STRINGS.minigame.resultGood; }

    const { wasPlayed, isRecord } = Storage.markMinigamePlayed(game.id, score);
    const base = Math.round(score * CONFIG.points.minigamePointsPerScoreUnit);
    let points = wasPlayed ? Math.round(base * CONFIG.points.repeatMultiplier) : base;
    if (isRecord) points += CONFIG.points.minigameRecordBonus;
    const postcardUnlocked = game.postcardId ? Storage.unlockPostcard(game.postcardId) : false;
    if (points > 0) Storage.addPoints(points);
    Sound.points();
    if (stars > 0) spawnConfetti(stage, { count: 16 });

    const result = el('div', 'msc-minigame-result');
    result.appendChild(createRibbon(headline));
    result.appendChild(createStarRow(stars));
    if (isRecord) {
      const rec = el('div', 'msc-minigame-record');
      rec.appendChild(el('span', 'msc-minigame-record__icon', { html: icon('star') }));
      rec.appendChild(el('span', null, { text: STRINGS.minigame.newRecord }));
      result.appendChild(rec);
    }
    const pointsLine = el('div', 'msc-minigame-result__points');
    pointsLine.appendChild(el('span', 'msc-minigame-result__points-icon', { html: icon('coin') }));
    pointsLine.appendChild(el('span', null, { text: STRINGS.minigame.pointsEarned(points) }));
    result.appendChild(pointsLine);
    if (wasPlayed) result.appendChild(el('p', 'msc-minigame-result__repeat-note', { text: STRINGS.minigame.repeatNote }));

    if (postcardUnlocked) {
      const postcard = el('div', 'msc-quiz-postcard');
      postcard.appendChild(el('span', 'msc-quiz-postcard__icon', { html: icon('postcard') }));
      postcard.appendChild(el('span', null, { text: STRINGS.minigame.postcardUnlocked }));
      result.appendChild(postcard);
    }

    const actions = el('div', 'msc-dialog-actions');
    const again = createButton({ label: STRINGS.minigame.playAgain, variant: 'orange', size: 'l' });
    const done = createButton({ label: STRINGS.minigame.back, variant: 'green', size: 'l' });
    again.button.addEventListener('click', () => renderCountdown());
    done.button.addEventListener('click', () => closeAll());
    actions.appendChild(again.el);
    actions.appendChild(done.el);
    result.appendChild(actions);
    stage.appendChild(result);
    done.button.focus();

    if (points > 0 && pointsBadgeEl) {
      const source = result.querySelector('.msc-minigame-result__points-icon');
      flyCoinsTo(source, pointsBadgeEl, Math.min(8, Math.max(3, Math.round(points / 5)))).then(() => {
        onPointsChanged?.(Storage.get().points);
      });
    } else {
      onPointsChanged?.(Storage.get().points);
    }
  }

  modal.open();
  renderIntro();
}
