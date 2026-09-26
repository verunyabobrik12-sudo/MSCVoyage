// Геймплей мини-игры «Не урони мяч» (Бассейн). Canvas-поле внутри каркаса
// src/ui/minigameScreen.js: каркас ведёт таймер, паузу, HUD и результат.
//
// По воде бассейна плавает надувной матрас (рисуется кодом), игрок двигает
// его влево-вправо. Пляжный мяч отскакивает от матраса как в арканоиде:
// куда попал — туда и полетит (ближе к краю — сильнее вбок). Упал в воду —
// брызги и минус жизнь, мяч появляется сверху заново. Сверху медленно падают
// бонусы (ловить матрасом) и ловушки (уворачиваться).
//
// 2026-09-26, по её отзыву: вертикальная ракетка (paddle.png) давала крошечную
// площадь удара, мяч падал слишком быстро — заменено на широкий горизонтальный
// матрас, мяч крупнее, «гравитация» слабее. Не используются: paddle,
// extra_ball_alt1/2, extra_chest_locked, extra_trap_urchin_dup; trap_splash —
// только как эффект брызг.

import { loadImage, cleanSprite, createFieldCanvas, createHorizontalControl } from './common.js';

const SPRITES = ['ball_main', 'bonus_star', 'bonus_coin', 'bonus_heart', 'trap_drop', 'trap_urchin', 'trap_splash'];

const POINTS_PER_HIT = 10;
const BONUS = {
  bonus_star: { points: 30 },
  bonus_coin: { points: 20 },
  bonus_heart: { life: 1, pointsIfFull: 20 },
};
const TRAPS = ['trap_urchin', 'trap_drop'];
// Очков для «100%»: бот с идеальным слежением за 45 с набирает ~300-330
// (мяч медленный, ~22 отскока) — человеку оставлен запас.
const TARGET_SCORE = 260;

// Кривые сложности по доле прошедшего раунда p = 0..1.
const GRAVITY = [0.62, 0.95]; // доля высоты поля / с² (было 1.1-1.6 — «мяч падает быстро»)
const ITEM_INTERVAL = [3.2, 1.6]; // сек между бонусами/ловушками
const TRAP_CHANCE = [0.3, 0.5];
const ITEM_FALL = [0.14, 0.22]; // доля высоты / с
const MAX_BOUNCE_ANGLE = (55 * Math.PI) / 180; // удар краем матраса

// Фон 848x1264: линия воды в бассейне (в пикселях исходника).
const BG_W = 848;
const BG_H = 1264;
const BG_WATER = 800;

const lerp = (a, b, t) => a + (b - a) * t;

let assetsPromise = null;
export function preloadBallGame() {
  if (!assetsPromise) {
    assetsPromise = (async () => {
      const [bg, ...imgs] = await Promise.all([
        loadImage('assets/minigames/ball/bg.png'),
        ...SPRITES.map((n) => loadImage(`assets/minigames/ball/sprites/${n}.png`)),
      ]);
      const sprites = {};
      SPRITES.forEach((n, i) => { sprites[n] = cleanSprite(imgs[i]); });
      return { bg, sprites };
    })();
    assetsPromise.catch(() => { assetsPromise = null; });
  }
  return assetsPromise;
}

/**
 * @param {{host:HTMLElement, onScore:(n:number)=>void, onLives:(n:number)=>void,
 *          onGameOver:()=>void, lives:number}} opts
 */
export function createBallGame({ host, onScore, onLives, onGameOver, lives }) {
  let assets = null;
  const field = createFieldCanvas(host, () => render());
  const { ctx, size } = field;
  const control = createHorizontalControl(host, field.canvas);
  const maxLives = lives;

  const state = {
    lives,
    score: 0,
    hits: 0,
    progress: 0,
    t: 0,
    matX: 0.5, // центр матраса, доля ширины
    matVx: 0, // px/с — чуть «подкручивает» отскок
    ball: null, // { x, y, vx, vy, spin } в px; null — ждём появления
    respawnT: 0.6,
    items: [],
    itemTimer: 2.4,
    effects: [], // брызги, всплывающие очки
    hurtT: 0,
    over: false,
  };

  // --- геометрия ------------------------------------------------------------
  function bgGeom() {
    const s = Math.max(size.w / BG_W, size.h / BG_H);
    return { s, offX: (size.w - BG_W * s) / 2, offY: size.h - BG_H * s };
  }
  function mat() {
    const w = Math.min(size.w * 0.38, 180);
    const h = w * 0.25;
    const g = bgGeom();
    const surface = g.offY + BG_WATER * g.s; // линия воды
    const bob = Math.sin(state.t * 2.2) * 2; // покачивание на воде
    return { w, h, cx: state.matX * size.w, top: surface - h * 0.55 + bob, surface };
  }
  function ballR() { return Math.max(20, Math.min(size.w * 0.085, 40)); }
  function gravity() { return lerp(GRAVITY[0], GRAVITY[1], state.progress) * size.h; }
  /** Скорость отскока: мяч взлетает примерно на 3/4 высоты над матрасом. */
  function launchSpeed(m) { return Math.sqrt(2 * gravity() * (m.top - ballR()) * lerp(0.7, 0.82, Math.random())); }

  function spawnBall() {
    state.ball = {
      x: lerp(0.3, 0.7, Math.random()) * size.w,
      y: size.h * 0.1,
      vx: (Math.random() - 0.5) * size.w * 0.15,
      vy: 0,
      spin: 0,
    };
  }

  function spawnItem() {
    const trap = Math.random() < lerp(TRAP_CHANCE[0], TRAP_CHANCE[1], state.progress);
    let name;
    if (trap) name = TRAPS[Math.floor(Math.random() * TRAPS.length)];
    else {
      const r = Math.random();
      name = r < 0.45 ? 'bonus_star' : r < 0.85 ? 'bonus_coin' : 'bonus_heart';
    }
    const r = mat().w * 0.13;
    state.items.push({
      name, trap, r,
      x: lerp(r, size.w - r, Math.random()),
      y: -r,
      speed: lerp(ITEM_FALL[0], ITEM_FALL[1], state.progress) * size.h * (0.85 + Math.random() * 0.3),
      wobble: Math.random() * Math.PI * 2,
    });
  }

  function popup(text, x, y, good) { state.effects.push({ kind: 'text', text, x, y, good, t: 0, life: 0.8 }); }

  function loseLife() {
    state.lives -= 1;
    state.hurtT = 0.35;
    onLives?.(state.lives);
    if (state.lives <= 0) { state.over = true; onGameOver?.(); return true; }
    return false;
  }

  // --- логика ---------------------------------------------------------------
  function update(dt, progress) {
    if (!assets || state.over) return;
    state.progress = Math.min(1, Math.max(0, progress));
    state.t += dt;

    const m0 = mat();
    const prevX = state.matX;
    const edge = (m0.w / 2 + 2) / size.w;
    state.matX = Math.min(1 - edge, Math.max(edge, control.step(state.matX, dt, 1.8)));
    state.matVx = ((state.matX - prevX) * size.w) / Math.max(dt, 1e-3);
    const m = mat();

    // мяч
    if (!state.ball) {
      state.respawnT -= dt;
      if (state.respawnT <= 0) spawnBall();
    } else {
      const b = state.ball;
      const br = ballR();
      const prevBottom = b.y + br;
      b.vy += gravity() * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += (b.vx * dt) / br;
      if (b.x < br) { b.x = br; b.vx = Math.abs(b.vx); }
      if (b.x > size.w - br) { b.x = size.w - br; b.vx = -Math.abs(b.vx); }
      if (b.y < br) { b.y = br; b.vy = Math.abs(b.vy) * 0.6; }

      // отскок от верха матраса: мяч падает, пересёк его верх и хоть краем над ним
      const bottom = b.y + br;
      const reach = m.w / 2 + br * 0.6;
      if (b.vy > 0 && prevBottom <= m.top + 4 && bottom >= m.top && Math.abs(b.x - m.cx) <= reach) {
        const offset = Math.max(-1, Math.min(1, (b.x - m.cx) / reach));
        const ang = offset * MAX_BOUNCE_ANGLE;
        const v = launchSpeed(m);
        b.vx = Math.sin(ang) * v + state.matVx * 0.15;
        b.vy = -Math.cos(ang) * v;
        const maxVx = size.w * 1.1;
        b.vx = Math.max(-maxVx, Math.min(maxVx, b.vx));
        b.y = m.top - br;
        state.hits += 1;
        state.score += POINTS_PER_HIT;
        onScore?.(state.score);
        popup(`+${POINTS_PER_HIT}`, b.x, b.y - br, true);
        state.effects.push({ kind: 'ripple', x: m.cx, y: m.surface, t: 0, life: 0.5 });
      }

      if (b.y - br > m.surface + m.h * 0.3) {
        state.effects.push({ kind: 'splash', x: b.x, y: m.surface, t: 0, life: 0.7 });
        state.ball = null;
        state.respawnT = 1.0;
        if (loseLife()) return;
      }
    }

    // бонусы и ловушки — ловятся матрасом
    state.itemTimer -= dt;
    if (state.itemTimer <= 0) {
      spawnItem();
      state.itemTimer = lerp(ITEM_INTERVAL[0], ITEM_INTERVAL[1], state.progress);
    }
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += it.speed * dt;
      it.wobble += dt * 3;
      const onMat = it.y + it.r * 0.7 >= m.top && it.y - it.r < m.top + m.h && Math.abs(it.x - m.cx) <= m.w / 2 + it.r * 0.5;
      if (onMat) {
        state.items.splice(i, 1);
        if (it.trap) {
          popup('−1 ♥', it.x, m.top - 10, false);
          if (loseLife()) return;
        } else {
          const bonus = BONUS[it.name];
          if (bonus.life && state.lives < maxLives) {
            state.lives += bonus.life;
            onLives?.(state.lives);
            popup('+1 ♥', it.x, m.top - 10, true);
          } else {
            const pts = bonus.points ?? bonus.pointsIfFull;
            state.score += pts;
            onScore?.(state.score);
            popup(`+${pts}`, it.x, m.top - 10, true);
          }
        }
        continue;
      }
      if (it.y - it.r > m.surface + m.h) state.items.splice(i, 1);
    }

    for (let i = state.effects.length - 1; i >= 0; i--) {
      state.effects[i].t += dt;
      if (state.effects[i].t > state.effects[i].life) state.effects.splice(i, 1);
    }
    if (state.hurtT > 0) state.hurtT -= dt;
    render();
  }

  // --- отрисовка ------------------------------------------------------------
  function drawSprite(name, cx, cy, maxSide, rot = 0, alpha = 1) {
    const img = assets.sprites[name];
    const sc = maxSide / Math.max(img.width, img.height);
    const w = img.width * sc;
    const h = img.height * sc;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Надувной матрас: полосатый (коралловый/белый), обводка в тон интерфейса. */
  function drawMat(m) {
    const x = m.cx - m.w / 2;
    // тень на воде
    ctx.fillStyle = 'rgba(0, 70, 90, 0.25)';
    ctx.beginPath();
    ctx.ellipse(m.cx, m.surface + m.h * 0.35, m.w * 0.52, m.h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    roundRect(x, m.top, m.w, m.h, m.h / 2);
    ctx.clip();
    const n = 7;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#FFF6E6' : '#F26B5B';
      ctx.fillRect(x + (m.w / n) * i, m.top, m.w / n + 1, m.h);
    }
    // блик сверху — объём надувного
    const hl = ctx.createLinearGradient(0, m.top, 0, m.top + m.h);
    hl.addColorStop(0, 'rgba(255,255,255,.55)');
    hl.addColorStop(0.45, 'rgba(255,255,255,0)');
    hl.addColorStop(1, 'rgba(0,0,0,.18)');
    ctx.fillStyle = hl;
    ctx.fillRect(x, m.top, m.w, m.h);
    ctx.restore();
    roundRect(x, m.top, m.w, m.h, m.h / 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#3B2414';
    ctx.stroke();
  }

  function render() {
    field.begin();
    if (!assets) return;
    const g = bgGeom();
    ctx.drawImage(assets.bg, g.offX, g.offY, BG_W * g.s, BG_H * g.s);

    const m = mat();
    for (const e of state.effects) {
      if (e.kind !== 'ripple') continue;
      const a = Math.max(0, 1 - e.t / e.life);
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + m.h * 0.3, m.w * (0.55 + e.t), m.h * (0.4 + e.t * 0.6), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawMat(m);

    for (const it of state.items) drawSprite(it.name, it.x + Math.sin(it.wobble) * 4, it.y, it.r * 2.2);

    if (state.ball) {
      const b = state.ball;
      const br = ballR();
      // тень на матрасе — подсказывает, куда падает мяч
      ctx.fillStyle = 'rgba(40, 60, 80, 0.25)';
      ctx.beginPath();
      ctx.ellipse(b.x, m.top + 2, br * 0.8, br * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      drawSprite('ball_main', b.x, b.y, br * 2.1, b.spin);
    }

    for (const e of state.effects) {
      const a = Math.max(0, 1 - e.t / e.life);
      if (e.kind === 'splash') {
        drawSprite('trap_splash', e.x, e.y - 10 - e.t * 20, ballR() * 3, 0, a);
      } else if (e.kind === 'text') {
        ctx.save();
        ctx.globalAlpha = a;
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
    }
    if (state.hurtT > 0) {
      ctx.fillStyle = `rgba(220, 40, 40, ${0.35 * (state.hurtT / 0.35)})`;
      ctx.fillRect(0, 0, size.w, size.h);
    }
  }

  const ready = preloadBallGame().then((a) => { assets = a; render(); });

  /** Итог 0..100 для каркаса (пороги звёзд — 60/90): очки к целевым TARGET_SCORE. */
  function resultScore() {
    return Math.round(Math.min(1, state.score / TARGET_SCORE) * 100);
  }

  function destroy() {
    control.destroy();
    field.destroy();
  }

  // _state/_geom — только для автотестов (tests/), игра их не читает
  return { ready, update, resultScore, destroy, _state: state, _geom: () => ({ ...mat(), ballR: ballR() }) };
}
