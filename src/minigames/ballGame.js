// Геймплей мини-игры «Не урони мяч» (Бассейн). Canvas-поле внутри каркаса
// src/ui/minigameScreen.js: каркас ведёт таймер, паузу, HUD и результат.
//
// Ракетка ездит по бортику бассейна, мяч летает под «гравитацией» и
// отскакивает от круглой головы ракетки — угол зависит от точки удара.
// Упал в воду — брызги и минус жизнь, мяч появляется сверху заново.
// Сверху медленно падают бонусы (ловить ракеткой) и ловушки (уворачиваться).
// Не используются: extra_ball_alt1/2, extra_chest_locked, extra_trap_urchin_dup
// (запасные варианты с листа), trap_splash — только как эффект брызг.

import { loadImage, cleanSprite, createFieldCanvas, createHorizontalControl } from './common.js';

const SPRITES = ['ball_main', 'paddle', 'bonus_star', 'bonus_coin', 'bonus_heart', 'trap_drop', 'trap_urchin', 'trap_splash'];

const POINTS_PER_HIT = 10;
const BONUS = {
  bonus_star: { points: 30 },
  bonus_coin: { points: 20 },
  bonus_heart: { life: 1, pointsIfFull: 20 },
};
const TRAPS = ['trap_urchin', 'trap_drop'];
// Очков для «100%»: ~25 отбитых мячей + немного бонусов за 45 с.
const TARGET_SCORE = 320;

// Кривые сложности по доле прошедшего раунда p = 0..1.
const GRAVITY = [1.1, 1.6]; // доля высоты поля / с²
const ITEM_INTERVAL = [3.2, 1.6]; // сек между бонусами/ловушками
const TRAP_CHANCE = [0.35, 0.55];
const ITEM_FALL = [0.16, 0.26]; // доля высоты / с

// Фон 848x1264: верх бортика бассейна и линия воды (в пикселях исходника).
const BG_W = 848;
const BG_H = 1264;
const BG_POOL_LIP = 745;
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
    paddleX: 0.5, // доля ширины
    paddleVx: 0, // px/с — «подкручивает» отскок
    ball: null, // { x, y, vx, vy, spin } в px; null — ждём появления
    respawnT: 0.6,
    items: [],
    itemTimer: 2.2,
    effects: [], // брызги, всплывающие очки
    hurtT: 0,
    over: false,
  };

  // --- геометрия ------------------------------------------------------------
  function bgGeom() {
    const s = Math.max(size.w / BG_W, size.h / BG_H);
    return { s, offX: (size.w - BG_W * s) / 2, offY: size.h - BG_H * s };
  }
  function paddleGeom() {
    const pw = Math.min(size.w * 0.24, 110);
    const k = pw / 157; // исходный спрайт ракетки 157x245, голова — круг ~r76 с центром на y≈80
    const g = bgGeom();
    const headR = 72 * k;
    const headY = g.offY + BG_POOL_LIP * g.s - headR * 0.9; // голова над бортиком
    return { pw, k, headR, headY, cx: state.paddleX * size.w };
  }
  function waterY() { const g = bgGeom(); return g.offY + BG_WATER * g.s; }
  function ballR() { return paddleGeom().headR * 0.62; }
  function gravity() { return lerp(GRAVITY[0], GRAVITY[1], state.progress) * size.h; }

  function spawnBall() {
    state.ball = {
      x: lerp(0.3, 0.7, Math.random()) * size.w,
      y: size.h * 0.12,
      vx: (Math.random() - 0.5) * size.w * 0.2,
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
    const r = paddleGeom().headR * 0.55;
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

    const pg0 = paddleGeom();
    const prevX = state.paddleX;
    const edge = (pg0.pw / 2 + 2) / size.w;
    state.paddleX = Math.min(1 - edge, Math.max(edge, control.step(state.paddleX, dt, 1.8)));
    state.paddleVx = ((state.paddleX - prevX) * size.w) / Math.max(dt, 1e-3);
    const pg = paddleGeom();

    // мяч
    if (!state.ball) {
      state.respawnT -= dt;
      if (state.respawnT <= 0) spawnBall();
    } else {
      const b = state.ball;
      const br = ballR();
      b.vy += gravity() * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += (b.vx * dt) / br;
      if (b.x < br) { b.x = br; b.vx = Math.abs(b.vx); }
      if (b.x > size.w - br) { b.x = size.w - br; b.vx = -Math.abs(b.vx); }
      if (b.y < br) { b.y = br; b.vy = Math.abs(b.vy) * 0.6; }

      // удар о голову ракетки (круг-круг), только если мяч летит к ней
      const dx = b.x - pg.cx;
      const dy = b.y - pg.headY;
      const dist = Math.hypot(dx, dy);
      if (dist < br + pg.headR && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        if (b.vx * nx + b.vy * ny < 0) {
          const g = gravity();
          const launch = Math.sqrt(2 * g * size.h * lerp(0.5, 0.62, Math.random()));
          b.vy = -launch * Math.max(0.55, -ny); // удар сбоку — ниже и сильнее вбок
          b.vx = nx * launch * 0.75 + state.paddleVx * 0.25;
          const maxVx = size.w * 1.3;
          b.vx = Math.max(-maxVx, Math.min(maxVx, b.vx));
          b.x = pg.cx + nx * (br + pg.headR + 1);
          b.y = pg.headY + ny * (br + pg.headR + 1);
          state.hits += 1;
          state.score += POINTS_PER_HIT;
          onScore?.(state.score);
          popup(`+${POINTS_PER_HIT}`, b.x, b.y - br, true);
        }
      }

      if (b.y - br > waterY()) {
        state.effects.push({ kind: 'splash', x: b.x, y: waterY(), t: 0, life: 0.7 });
        state.ball = null;
        state.respawnT = 1.0;
        if (loseLife()) return;
      }
    }

    // бонусы и ловушки
    state.itemTimer -= dt;
    if (state.itemTimer <= 0) {
      spawnItem();
      state.itemTimer = lerp(ITEM_INTERVAL[0], ITEM_INTERVAL[1], state.progress);
    }
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += it.speed * dt;
      it.wobble += dt * 3;
      if (Math.hypot(it.x - pg.cx, it.y - pg.headY) < pg.headR + it.r * 0.8) {
        state.items.splice(i, 1);
        if (it.trap) {
          popup('−1 ♥', it.x, it.y, false);
          if (loseLife()) return;
        } else {
          const bonus = BONUS[it.name];
          if (bonus.life && state.lives < maxLives) {
            state.lives += bonus.life;
            onLives?.(state.lives);
            popup('+1 ♥', it.x, it.y, true);
          } else {
            const pts = bonus.points ?? bonus.pointsIfFull;
            state.score += pts;
            onScore?.(state.score);
            popup(`+${pts}`, it.x, it.y, true);
          }
        }
        continue;
      }
      if (it.y - it.r > waterY()) state.items.splice(i, 1);
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

  function render() {
    field.begin();
    if (!assets) return;
    const g = bgGeom();
    ctx.drawImage(assets.bg, g.offX, g.offY, BG_W * g.s, BG_H * g.s);

    const pg = paddleGeom();
    // ракетка: спрайт 157x245, центр головы на (78, 80) исходника
    const img = assets.sprites.paddle;
    const pw = pg.pw;
    const ph = (img.height / img.width) * pw;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.drawImage(img, pg.cx - pw / 2, pg.headY - 80 * pg.k, pw, ph);
    ctx.restore();

    for (const it of state.items) drawSprite(it.name, it.x + Math.sin(it.wobble) * 4, it.y, it.r * 2.2);

    if (state.ball) {
      const b = state.ball;
      const br = ballR();
      // тень на бортике — подсказывает, куда падает мяч
      ctx.fillStyle = 'rgba(40, 60, 80, 0.22)';
      ctx.beginPath();
      ctx.ellipse(b.x, pg.headY + pg.headR * 0.9, br * 0.8, br * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      drawSprite('ball_main', b.x, b.y, br * 2.1, b.spin);
    }

    for (const e of state.effects) {
      const a = Math.max(0, 1 - e.t / e.life);
      if (e.kind === 'splash') {
        drawSprite('trap_splash', e.x, e.y - 10 - e.t * 20, ballR() * 3, 0, a);
      } else {
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

  // _state — только для автотестов (tests/), игра его не читает
  return { ready, update, resultScore, destroy, _state: state, _geom: () => ({ ...paddleGeom(), waterY: waterY(), ballR: ballR() }) };
}
