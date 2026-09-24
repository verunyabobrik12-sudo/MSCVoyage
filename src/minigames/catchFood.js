// Геймплей мини-игры «Поймай итальянское» (Ресторан). Canvas-поле внутри
// каркаса src/ui/minigameScreen.js: каркас ведёт таймер, паузу, HUD и
// результат, а здесь — только падающая еда, героиня с подносом и столкновения.
//
// Героиня — тот же лист hero_girl, что и в сценах (catch/player.jfif — мужчина-
// официант, не подключён), поднос рисуется процедурно поверх кадра.
// Базилик исключён: при хромакее листья частично вырезались вместе с зелёным фоном.

const ITALIAN = ['pizza_italian', 'pasta_italian', 'parmesan_italian', 'olives_italian',
  'tiramisu_italian', 'tomato_italian', 'espresso_italian'];
const FOREIGN = ['sushi_asian', 'ramen_asian', 'dimsum_asian', 'chopsticks_asian'];

const POINTS_PER_CATCH = 10;

// Кривые сложности по доле прошедшего раунда p = 0..1.
const SPAWN_INTERVAL = [1.0, 0.45]; // сек между появлениями
const FALL_SPEED = [0.30, 0.70]; // доля высоты поля в секунду
const FOREIGN_CHANCE = [0.25, 0.40];

const lerp = (a, b, t) => a + (b - a) * t;

const CACHE_BUST = `v=${Date.now()}`;
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `${src}?${CACHE_BUST}`;
  });
}

let assetsPromise = null;
/** Грузит фон, предметы и лист героини один раз на всю сессию. */
export function preloadCatchFood() {
  if (!assetsPromise) {
    assetsPromise = (async () => {
      const heroMeta = await fetch(`assets/sprites/hero_girl.json?${CACHE_BUST}`).then((r) => r.json());
      const [bg, hero, ...items] = await Promise.all([
        loadImage('assets/minigames/catch/bg.png'),
        loadImage(`assets/sprites/${heroMeta.file}`),
        ...ITALIAN.concat(FOREIGN).map((n) => loadImage(`assets/minigames/catch/items/${n}.png`)),
      ]);
      const itemImages = {};
      ITALIAN.concat(FOREIGN).forEach((n, i) => { itemImages[n] = items[i]; });
      return { bg, hero, heroMeta, itemImages };
    })();
    assetsPromise.catch(() => { assetsPromise = null; }); // дать шанс повторить загрузку
  }
  return assetsPromise;
}

/**
 * @param {{host:HTMLElement, onScore:(n:number)=>void, onLives:(n:number)=>void,
 *          onGameOver:()=>void, lives:number}} opts
 */
export function createCatchFood({ host, onScore, onLives, onGameOver, lives }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'msc-minigame-canvas';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let assets = null;
  let w = 0;
  let h = 0;
  let dpr = 1;

  const state = {
    lives,
    score: 0,
    caught: 0,
    missed: 0, // итальянская еда, упавшая мимо (без штрафа, но влияет на итоговую долю)
    progress: 0,
    spawnTimer: 0.4,
    items: [],
    popups: [], // всплывающие "+10" / вспышки
    heroX: 0.5, // доля ширины
    targetX: null, // куда тянет указатель (доля ширины), null — не тянет
    keyDir: 0,
    hurtT: 0, // красная вспышка после чужой кухни
    over: false,
  };

  // --- размеры ---------------------------------------------------------------
  function resize() {
    const rect = host.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    render();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  function heroSize() {
    const heroH = Math.min(h * 0.3, w * 0.55);
    const meta = assets?.heroMeta;
    const heroW = meta ? heroH * (meta.frameWidth / meta.frameHeight) : heroH * 0.47;
    return { heroW, heroH };
  }
  function itemSize() { return Math.max(40, Math.min(78, w * 0.15)); }
  function trayGeom() {
    const { heroW, heroH } = heroSize();
    const feetY = h - 6;
    return {
      cx: state.heroX * w,
      y: feetY - heroH * 0.5, // на уровне груди — героиня держит поднос перед собой
      halfW: heroW * 0.75,
    };
  }

  // --- управление ------------------------------------------------------------
  function pointerToTarget(e) {
    const rect = canvas.getBoundingClientRect();
    state.targetX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  }
  function onPointerDown(e) { host.setPointerCapture?.(e.pointerId); pointerToTarget(e); }
  function onPointerMove(e) { if (e.pointerType === 'mouse' || e.buttons) pointerToTarget(e); }
  function onPointerLeave(e) { if (e.pointerType === 'mouse') state.targetX = null; }
  const held = new Set();
  function onKey(e) {
    const left = e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф';
    const right = e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В';
    if (!left && !right) return;
    e.preventDefault();
    const k = left ? 'L' : 'R';
    if (e.type === 'keydown') held.add(k); else held.delete(k);
    state.keyDir = (held.has('R') ? 1 : 0) - (held.has('L') ? 1 : 0);
    if (state.keyDir) state.targetX = null; // клавиатура перебивает указатель
  }
  // на host, а не на canvas — чтобы срабатывал и тап по рамке поля у самого края
  host.addEventListener('pointerdown', onPointerDown);
  host.addEventListener('pointermove', onPointerMove);
  host.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  // --- логика ----------------------------------------------------------------
  function spawn() {
    const foreign = Math.random() < lerp(FOREIGN_CHANCE[0], FOREIGN_CHANCE[1], state.progress);
    const pool = foreign ? FOREIGN : ITALIAN;
    const name = pool[Math.floor(Math.random() * pool.length)];
    const size = itemSize();
    const margin = size / 2 / w;
    state.items.push({
      name,
      foreign,
      x: lerp(margin, 1 - margin, Math.random()), // доля ширины
      y: -size / 2, // пиксели
      speed: lerp(FALL_SPEED[0], FALL_SPEED[1], state.progress) * (0.85 + Math.random() * 0.3),
      rot: (Math.random() - 0.5) * 0.6,
      spin: (Math.random() - 0.5) * 1.6,
    });
  }

  function update(dt, progress) {
    if (!assets || state.over) return;
    state.progress = Math.min(1, Math.max(0, progress));

    // движение героини: к указателю или стрелками, с ограничением скорости
    const maxStep = 1.6 * dt; // доля ширины за кадр
    if (state.keyDir) {
      state.heroX += state.keyDir * maxStep;
    } else if (state.targetX !== null) {
      const d = state.targetX - state.heroX;
      state.heroX += Math.sign(d) * Math.min(Math.abs(d), maxStep);
    }
    // упор в край — по подносу, он шире фигуры (иначе у края поднос обрезается)
    const edge = (trayGeom().halfW + 2) / w;
    state.heroX = Math.min(1 - edge, Math.max(edge, state.heroX));

    // появление еды
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawn();
      state.spawnTimer = lerp(SPAWN_INTERVAL[0], SPAWN_INTERVAL[1], state.progress);
    }

    // Поимка: низ предмета в полосе от подноса до пояса героини, и предмет хоть
    // как-то перекрывает поднос по горизонтали. Раньше ловилось только само
    // пересечение линии подноса и только центром — еда, визуально висящая над
    // героиней, пролетала насквозь (подъехала на кадр позже / центр чуть в стороне).
    const tray = trayGeom();
    const size = itemSize();
    const band = Math.max(size * 0.6, heroSize().heroH * 0.25);
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += it.speed * h * dt;
      it.rot += it.spin * dt;
      const bottom = it.y + size * 0.35;
      const px = it.x * w;
      const inBand = bottom >= tray.y && bottom <= tray.y + band;
      if (inBand && Math.abs(px - tray.cx) <= tray.halfW + size * 0.4) {
        state.items.splice(i, 1);
        if (it.foreign) {
          state.lives -= 1;
          state.hurtT = 0.35;
          state.popups.push({ kind: 'bad', x: px, y: tray.y - 10, t: 0 });
          onLives?.(state.lives);
          if (state.lives <= 0) { state.over = true; onGameOver?.(); return; }
        } else {
          state.caught += 1;
          state.score += POINTS_PER_CATCH;
          state.popups.push({ kind: 'good', x: px, y: tray.y - 10, t: 0 });
          onScore?.(state.score);
        }
        continue;
      }
      if (it.y - size / 2 > h) {
        state.items.splice(i, 1);
        if (!it.foreign) state.missed += 1;
      }
    }

    for (let i = state.popups.length - 1; i >= 0; i--) {
      state.popups[i].t += dt;
      if (state.popups[i].t > 0.8) state.popups.splice(i, 1);
    }
    if (state.hurtT > 0) state.hurtT -= dt;
    render();
  }

  // --- отрисовка -------------------------------------------------------------
  function drawCover(img) {
    // заполнить поле, прижав к низу — пол ресторана всегда виден под героиней
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (w - dw) / 2, h - dh, dw, dh);
  }

  function drawHero() {
    const { hero, heroMeta } = assets;
    const { heroW, heroH } = heroSize();
    // один статичный кадр «лицом вперёд» — анимация ходьбы на месте мигала
    const row = heroMeta.directions.down;
    const frame = 0;
    const cx = state.heroX * w;
    const feetY = h - 6;
    // тень
    ctx.fillStyle = 'rgba(60, 30, 10, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, feetY - 2, heroW * 0.4, heroW * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(hero,
      frame * heroMeta.frameWidth, row * heroMeta.frameHeight, heroMeta.frameWidth, heroMeta.frameHeight,
      cx - heroW / 2, feetY - heroH, heroW, heroH);
  }

  function drawTray() {
    const t = trayGeom();
    const rimH = Math.max(5, t.halfW * 0.12);
    ctx.save();
    // кромка подноса (вид чуть сверху) + лицевая сторона
    ctx.fillStyle = '#8a5a2b';
    ctx.strokeStyle = '#4a2c12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(t.cx, t.y + rimH * 0.6, t.halfW, rimH * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c98a4b';
    ctx.beginPath();
    ctx.ellipse(t.cx, t.y, t.halfW * 0.96, rimH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawItem(it, size) {
    const img = assets.itemImages[it.name];
    const scale = size / Math.max(img.width, img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.save();
    ctx.translate(it.x * w, it.y);
    ctx.rotate(it.rot);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  function drawPopups() {
    for (const p of state.popups) {
      const a = 1 - p.t / 0.8;
      const y = p.y - p.t * 50;
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = '900 22px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = p.kind === 'good' ? '#2f8a2f' : '#c62828';
      const text = p.kind === 'good' ? `+${POINTS_PER_CATCH}` : '−1 ♥';
      ctx.strokeText(text, p.x, y);
      ctx.fillText(text, p.x, y);
      ctx.restore();
    }
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, w, h);
    if (!assets) return;
    drawCover(assets.bg);
    drawHero();
    drawTray();
    const size = itemSize();
    for (const it of state.items) drawItem(it, size);
    drawPopups();
    if (state.hurtT > 0) {
      ctx.fillStyle = `rgba(220, 40, 40, ${0.35 * (state.hurtT / 0.35)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  const ready = preloadCatchFood().then((a) => { assets = a; resize(); });

  /**
   * Итог 0..100 для каркаса (пороги звёзд — 60/90): доля пойманной итальянской
   * еды. Если жизни кончились раньше таймера, знаменатель достраивается до
   * полного раунда пропорционально прошедшему времени — иначе ранний проигрыш
   * с парой удачных поимок выглядел бы как «отлично».
   */
  function resultScore() {
    const resolved = state.caught + state.missed;
    if (resolved === 0) return 0;
    const p = Math.max(0.05, state.progress);
    const denom = state.over && p < 1 ? resolved / p : resolved;
    return Math.round(Math.min(1, state.caught / denom) * 100);
  }

  function destroy() {
    ro.disconnect();
    host.removeEventListener('pointerdown', onPointerDown);
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    canvas.remove();
  }

  // _state — только для автотестов (tests/), игра его не читает
  return { ready, update, resultScore, destroy, _state: state };
}
