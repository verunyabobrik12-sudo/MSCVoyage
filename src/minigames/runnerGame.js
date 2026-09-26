// Геймплей мини-игры «Монетки Треви» (Рим). Canvas-поле внутри каркаса
// src/ui/minigameScreen.js: каркас ведёт таймер, паузу, HUD и результат.
//
// Боковой раннер: героиня бежит вправо, фон едет с параллаксом (far/mid/
// ground — бесшовные за счёт зеркального повтора, см. prepare_minigame_assets).
// Прыжок — тап/клик/пробел/стрелка вверх. Препятствия перепрыгивать, монеты
// собирать (на земле и дугой над препятствиями). В конце въезжает фонтан Треви.
// Кадры бега — run_1..run_4 (один исходный ряд, без отражений), в воздухе
// jump_up, после удара stumble. walk_alt_*, back_view_*, run_5..7 не нужны.

import { loadImage, createFieldCanvas } from './common.js';

const RUN_FRAMES = ['run_1', 'run_2', 'run_3', 'run_4'];
const HERO_FRAMES = [...RUN_FRAMES, 'jump_up', 'stumble'];
const COIN_FRAMES = ['coin_spin_1', 'coin_spin_2', 'coin_spin_3', 'coin_spin_4'];
// Высота препятствия — доля роста героини (прыжок поднимает ноги на ~1 рост).
// Лужа убрана: плоская, сливается с брусчаткой при любом размере (её отзыв
// 2026-09-26: мелкие препятствия не видно). Голубь увеличен по той же причине.
const OBSTACLES = {
  scooter: 0.78,
  pigeon: 0.45,
  suitcase: 0.72,
  tourist_group: 0.92,
  luggage_pile: 0.82,
};
const OBSTACLE_NAMES = Object.keys(OBSTACLES);

const POINTS_PER_COIN = 10;
// Все монеты не собрать даже при идеальной игре (часть висит дугой в стороне
// от вершины прыжка): 85% собранных — уже 100% результата.
const FULL_SHARE = 0.85;

// Кривые сложности по доле прошедшего раунда p = 0..1.
const SPEED = [0.5, 0.85]; // ширины поля в секунду
const OBSTACLE_INTERVAL = [1.6, 1.0]; // сек (+ случайно до 0.5)
const JUMP_TIME = 0.95; // сек в воздухе
const STOP_SPAWN_AT = 0.9; // после этого — только фонтан на финише
const FOUNTAIN_AT = 0.9;

const lerp = (a, b, t) => a + (b - a) * t;

/** Центр корпуса по X (верхние 45% силуэта) — одинаковая точка привязки для
 *  всех кадров: bbox у кадров разный из-за рук/ног, и по нему героиня дрожала бы. */
function torsoAnchor(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const rows = Math.floor(img.height * 0.45);
  const d = ctx.getImageData(0, 0, img.width, rows).data;
  let sum = 0;
  let n = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < img.width; x++) {
      if (d[(y * img.width + x) * 4 + 3] > 40) { sum += x; n++; }
    }
  }
  return n ? sum / n / img.width : 0.5;
}

let assetsPromise = null;
export function preloadRunnerGame() {
  if (!assetsPromise) {
    assetsPromise = (async () => {
      const base = 'assets/minigames/runner';
      const [far, mid, ground, fountain, ...rest] = await Promise.all([
        loadImage(`${base}/far.png`),
        loadImage(`${base}/mid.png`),
        loadImage(`${base}/ground.png`),
        loadImage(`${base}/obstacles/fountain_finish.png`),
        ...HERO_FRAMES.map((n) => loadImage(`${base}/${n}.png`)),
        ...OBSTACLE_NAMES.map((n) => loadImage(`${base}/obstacles/${n}.png`)),
        ...COIN_FRAMES.map((n) => loadImage(`${base}/obstacles/${n}.png`)),
      ]);
      const hero = {};
      HERO_FRAMES.forEach((n, i) => { hero[n] = { img: rest[i], ax: torsoAnchor(rest[i]) }; });
      const obstacles = {};
      OBSTACLE_NAMES.forEach((n, i) => { obstacles[n] = rest[HERO_FRAMES.length + i]; });
      const coins = COIN_FRAMES.map((_, i) => rest[HERO_FRAMES.length + OBSTACLE_NAMES.length + i]);
      return { far, mid, ground, fountain, hero, obstacles, coins };
    })();
    assetsPromise.catch(() => { assetsPromise = null; });
  }
  return assetsPromise;
}

/**
 * @param {{host:HTMLElement, onScore:(n:number)=>void, onLives:(n:number)=>void,
 *          onGameOver:()=>void, lives:number}} opts
 */
export function createRunnerGame({ host, onScore, onLives, onGameOver, lives }) {
  let assets = null;
  const field = createFieldCanvas(host, () => render());
  const { ctx, size } = field;

  const state = {
    lives,
    score: 0,
    coinsTaken: 0,
    coinsMissed: 0,
    progress: 0,
    dist: 0, // пройдено, px — для параллакса
    heroY: 0, // высота ног над землёй, px (0 — на земле)
    heroVy: 0,
    runT: 0,
    stumbleT: 0, // кадр «споткнулась»
    invulnT: 0, // неуязвимость после удара
    obstacles: [], // { name, x, w, h } — x левого края в px экрана
    coins: [], // { x, yUp, r, t } — yUp: высота центра над землёй
    obstacleTimer: 1.2,
    coinTimer: 0.6,
    fountain: null, // { x }
    effects: [],
    hurtT: 0,
    over: false,
  };

  // --- геометрия ------------------------------------------------------------
  function layout() {
    const gH = size.h * 0.27; // полоса мостовой
    const groundTop = size.h - gH;
    // бег — по брусчатке, а не по бордюру (верхние ~25% полосы — бордюр)
    const feetY = groundTop + gH * 0.52;
    // меньше прежних 0.24/0.42: крупная героиня собирала и верхние монеты без прыжка
    const heroH = Math.min(size.h * 0.19, size.w * 0.34);
    return { gH, groundTop, feetY, heroH, heroX: size.w * 0.24 };
  }
  function jumpPhysics() {
    const { heroH } = layout();
    const apex = heroH * 1.3; // ноги выше самого высокого препятствия с запасом
    const v0 = (4 * apex) / JUMP_TIME;
    const g = (2 * v0) / JUMP_TIME;
    return { v0, g, apex };
  }
  function speed() { return lerp(SPEED[0], SPEED[1], state.progress) * size.w; }

  // --- управление: прыжок ---------------------------------------------------
  function jump() {
    if (!assets || state.over || state.heroY > 0.5) return;
    state.heroVy = jumpPhysics().v0;
  }
  const onPointer = (e) => { e.preventDefault(); jump(); };
  const onKey = (e) => {
    if (e.type !== 'keydown') return;
    if ([' ', 'ArrowUp', 'w', 'W', 'ц', 'Ц'].includes(e.key)) { e.preventDefault(); if (!e.repeat) jump(); }
  };
  host.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', onKey);

  // --- появление ------------------------------------------------------------
  function spawnObstacle() {
    const L = layout();
    const name = OBSTACLE_NAMES[Math.floor(Math.random() * OBSTACLE_NAMES.length)];
    const img = assets.obstacles[name];
    const h = L.heroH * OBSTACLES[name];
    const w = (img.width / img.height) * h;
    const x = size.w + 10;
    state.obstacles.push({ name, x, w, h });
    // низкие монеты из недавно начатого ряда не должны лежать на препятствии —
    // их нельзя собрать, не врезавшись (ряд ещё «доезжает» справа)
    const gap = L.heroH * 0.35;
    state.coins = state.coins.filter((c) => c.yUp >= L.heroH || c.x < x - gap || c.x > x + w + gap);
    // половина препятствий — с дугой монет сверху (собираются в прыжке)
    if (Math.random() < 0.5) {
      const { apex } = jumpPhysics();
      const r = L.heroH * 0.1;
      for (let i = 0; i < 3; i++) {
        // выше роста героини — собираются только в прыжке
        const yUp = Math.max(L.heroH * 1.2, h + apex * (i === 1 ? 0.6 : 0.45));
        state.coins.push({ x: x + w / 2 + (i - 1) * r * 2.6, yUp, r, t: Math.random() });
      }
    }
  }
  function spawnCoinRow() {
    const L = layout();
    const r = L.heroH * 0.1;
    const n = 3 + Math.floor(Math.random() * 3);
    const x0 = size.w + 10;
    // не класть монеты внутрь ближайшего препятствия
    const last = state.obstacles[state.obstacles.length - 1];
    if (last && last.x + last.w > x0 - r * 4) return;
    // низкий ряд — на бегу; высокий (выше роста) — только прыжком
    const high = Math.random() < 0.4;
    const yUp = high ? L.heroH * 1.35 : L.heroH * 0.35;
    for (let i = 0; i < n; i++) state.coins.push({ x: x0 + i * r * 2.6, yUp, r, t: Math.random() });
  }

  function popup(text, x, y, good) { state.effects.push({ text, x, y, good, t: 0 }); }

  // --- логика ---------------------------------------------------------------
  function update(dt, progress) {
    if (!assets || state.over) return;
    state.progress = Math.min(1, Math.max(0, progress));
    const L = layout();
    const v = speed();
    const dx = v * dt;
    state.dist += dx;

    // прыжок
    if (state.heroY > 0 || state.heroVy > 0) {
      const { g } = jumpPhysics();
      state.heroVy -= g * dt;
      state.heroY += state.heroVy * dt;
      if (state.heroY <= 0) { state.heroY = 0; state.heroVy = 0; }
    }
    state.runT += dt;
    if (state.stumbleT > 0) state.stumbleT -= dt;
    if (state.invulnT > 0) state.invulnT -= dt;
    if (state.hurtT > 0) state.hurtT -= dt;

    // появление
    if (state.progress < STOP_SPAWN_AT) {
      state.obstacleTimer -= dt;
      if (state.obstacleTimer <= 0) {
        spawnObstacle();
        state.obstacleTimer = lerp(OBSTACLE_INTERVAL[0], OBSTACLE_INTERVAL[1], state.progress) + Math.random() * 0.5;
      }
      state.coinTimer -= dt;
      if (state.coinTimer <= 0) {
        spawnCoinRow();
        state.coinTimer = 1.1 + Math.random() * 0.8;
      }
    }
    if (!state.fountain && state.progress >= FOUNTAIN_AT) state.fountain = { x: size.w };
    if (state.fountain) state.fountain.x = Math.max(size.w * 0.45, state.fountain.x - dx);

    // хитбокс героини: узкий корпус, ноги — по heroY
    const hx0 = L.heroX - L.heroH * 0.12;
    const hx1 = L.heroX + L.heroH * 0.12;
    const hyBottom = L.feetY - state.heroY; // экранный y ног
    const hyTop = hyBottom - L.heroH * 0.85;

    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const o = state.obstacles[i];
      o.x -= dx;
      if (o.x + o.w < -10) { state.obstacles.splice(i, 1); continue; }
      if (o.hit || state.invulnT > 0) continue;
      const ox0 = o.x + o.w * 0.18;
      const ox1 = o.x + o.w * 0.82;
      const oyTop = L.feetY - o.h * 0.85;
      if (hx1 > ox0 && hx0 < ox1 && hyBottom > oyTop && hyTop < L.feetY) {
        o.hit = true;
        state.lives -= 1;
        state.stumbleT = 0.5;
        state.invulnT = 1.2;
        state.hurtT = 0.35;
        popup('−1 ♥', L.heroX, hyTop, false);
        onLives?.(state.lives);
        if (state.lives <= 0) { state.over = true; onGameOver?.(); return; }
      }
    }

    for (let i = state.coins.length - 1; i >= 0; i--) {
      const c = state.coins[i];
      c.x -= dx;
      c.t += dt;
      const cy = L.feetY - c.yUp;
      if (c.x > hx0 - c.r && c.x < hx1 + c.r && cy > hyTop - c.r && cy < hyBottom + c.r) {
        state.coins.splice(i, 1);
        state.coinsTaken += 1;
        state.score += POINTS_PER_COIN;
        onScore?.(state.score);
        popup(`+${POINTS_PER_COIN}`, c.x, cy - c.r, true);
        continue;
      }
      if (c.x + c.r < hx0 - 4) { state.coins.splice(i, 1); state.coinsMissed += 1; }
    }

    for (let i = state.effects.length - 1; i >= 0; i--) {
      state.effects[i].t += dt;
      if (state.effects[i].t > 0.8) state.effects.splice(i, 1);
    }
    render();
  }

  // --- отрисовка ------------------------------------------------------------
  /** Бесшовная полоса: картинка высотой h, низ на bottomY, сдвиг offset px. */
  function drawStrip(img, bottomY, h, offset) {
    const w = (img.width / img.height) * h;
    let x = -((offset % w) + w) % w;
    for (; x < size.w; x += w) ctx.drawImage(img, x, bottomY - h, w, h);
  }

  function render() {
    field.begin();
    if (!assets) return;
    const L = layout();
    // небо под дальним слоем — на случай, если он ниже верха поля
    const sky = ctx.createLinearGradient(0, 0, 0, L.groundTop);
    sky.addColorStop(0, '#8FCBEF');
    sky.addColorStop(1, '#D6EEF8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size.w, L.groundTop);
    // дальний слой — до самого верха поля, иначе над ним видна полоса другого неба
    drawStrip(assets.far, L.groundTop + L.gH * 0.05, L.groundTop + L.gH * 0.05, state.dist * 0.15);
    // у mid.png нижние ~10.6% прозрачные — опускаем слой, чтобы дома уходили
    // за бордюр (иначе между ними видна полоса неба дальнего слоя)
    const midH = L.groundTop * 0.6;
    drawStrip(assets.mid, L.groundTop + midH * 0.12, midH, state.dist * 0.45);
    drawStrip(assets.ground, size.h, L.gH, state.dist);

    if (state.fountain) {
      const fh = size.h * 0.5;
      const fw = (assets.fountain.width / assets.fountain.height) * fh;
      ctx.drawImage(assets.fountain, state.fountain.x, L.feetY + L.gH * 0.1 - fh, fw, fh);
    }

    for (const o of state.obstacles) {
      // тень под препятствием — отделяет его от пёстрой брусчатки
      ctx.fillStyle = 'rgba(40, 25, 10, 0.35)';
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2, L.feetY, o.w * 0.55, Math.max(4, o.h * 0.09), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(assets.obstacles[o.name], o.x, L.feetY - o.h, o.w, o.h);
    }
    for (const c of state.coins) {
      const fr = assets.coins[Math.floor(c.t * 10) % assets.coins.length];
      const h = c.r * 2;
      const w = (fr.width / fr.height) * h;
      ctx.drawImage(fr, c.x - w / 2, L.feetY - c.yUp - h / 2, w, h);
    }

    // героиня: мигает во время неуязвимости
    const blink = state.invulnT > 0 && Math.floor(state.invulnT * 10) % 2 === 0;
    if (!blink) {
      let key;
      if (state.stumbleT > 0) key = 'stumble';
      else if (state.heroY > 0) key = 'jump_up';
      else key = RUN_FRAMES[Math.floor(state.runT * 10) % RUN_FRAMES.length];
      const fr = assets.hero[key];
      const h = L.heroH;
      const w = (fr.img.width / fr.img.height) * h;
      // тень на земле
      ctx.fillStyle = 'rgba(40, 25, 10, 0.25)';
      ctx.beginPath();
      ctx.ellipse(L.heroX, L.feetY, L.heroH * 0.18 * Math.max(0.5, 1 - state.heroY / (L.heroH * 1.5)), L.heroH * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(fr.img, L.heroX - fr.ax * w, L.feetY - state.heroY - h, w, h);
    }

    for (const e of state.effects) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - e.t / 0.8);
      ctx.font = '900 22px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = e.good ? '#2f8a2f' : '#c62828';
      const y = e.y - e.t * 50;
      ctx.strokeText(e.text, e.x, y);
      ctx.fillText(e.text, e.x, y);
      ctx.restore();
    }
    if (state.hurtT > 0) {
      ctx.fillStyle = `rgba(220, 40, 40, ${0.35 * (state.hurtT / 0.35)})`;
      ctx.fillRect(0, 0, size.w, size.h);
    }
  }

  const ready = preloadRunnerGame().then((a) => { assets = a; render(); });

  /**
   * Итог 0..100 для каркаса (пороги звёзд — 60/90): доля собранных монет
   * относительно FULL_SHARE.
   * При раннем проигрыше знаменатель достраивается до полного раунда.
   */
  function resultScore() {
    const resolved = state.coinsTaken + state.coinsMissed;
    if (resolved === 0) return 0;
    const p = Math.max(0.05, Math.min(state.progress, STOP_SPAWN_AT) / STOP_SPAWN_AT);
    const denom = state.over && p < 1 ? resolved / p : resolved;
    return Math.round(Math.min(1, state.coinsTaken / denom / FULL_SHARE) * 100);
  }

  function destroy() {
    host.removeEventListener('pointerdown', onPointer);
    window.removeEventListener('keydown', onKey);
    field.destroy();
  }

  // _state/_layout/_jump — только для автотестов (tests/), игра их не читает
  return { ready, update, resultScore, destroy, _state: state, _layout: layout, _jump: jump };
}
