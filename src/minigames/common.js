// Общее для геймплея мини-игр (src/minigames/*): загрузка картинок с
// cache-busting и очистка спрайтов, нарезанных сеткой из общего листа.

const CACHE_BUST = `v=${Date.now()}`;

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `${src}?${CACHE_BUST}`;
  });
}

export function loadJson(src) {
  return fetch(`${src}?${CACHE_BUST}`).then((r) => r.json());
}

/**
 * Оставляет в спрайте только самый крупный связный силуэт и обрезает по нему.
 * Листы (ball/sprites) нарезаны ровной сеткой, а объекты на них не всегда
 * помещаются в свою ячейку — в соседнюю попадают обрывки (кончик ракетки над
 * брызгами, край брызг у капли). Возвращает canvas, его можно рисовать как картинку.
 */
export function cleanSprite(img, alphaThreshold = 20) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const label = new Int32Array(w * h); // 0 — не размечено / прозрачно
  const stack = new Int32Array(w * h);
  let best = 0;
  let bestArea = 0;
  let next = 1;
  for (let i = 0; i < w * h; i++) {
    if (label[i] || px[i * 4 + 3] <= alphaThreshold) continue;
    const id = next++;
    let area = 0;
    let sp = 0;
    stack[sp++] = i;
    label[i] = id;
    while (sp > 0) {
      const cur = stack[--sp];
      area++;
      const x = cur % w;
      const y = (cur - x) / w;
      const nb = [x > 0 ? cur - 1 : -1, x < w - 1 ? cur + 1 : -1, y > 0 ? cur - w : -1, y < h - 1 ? cur + w : -1];
      for (const n of nb) {
        if (n < 0 || label[n] || px[n * 4 + 3] <= alphaThreshold) continue;
        label[n] = id;
        stack[sp++] = n;
      }
    }
    if (area > bestArea) { bestArea = area; best = id; }
  }
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < w * h; i++) {
    if (label[i] === best) {
      const x = i % w;
      const y = (i - x) / w;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else if (px[i * 4 + 3] > alphaThreshold) {
      px[i * 4 + 3] = 0; // обрывок — стираем (полупрозрачную кайму основного силуэта не трогаем)
    }
  }
  ctx.putImageData(data, 0, 0);
  if (maxX < 0) return c;
  const pad = 2;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext('2d').drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/**
 * Canvas во весь host с учётом devicePixelRatio. onResize(w, h) вызывается
 * при каждом изменении размера (CSS-пиксели). Возвращает { canvas, ctx, size, destroy }.
 */
export function createFieldCanvas(host, onResize) {
  const canvas = document.createElement('canvas');
  canvas.className = 'msc-minigame-canvas';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const size = { w: 1, h: 1, dpr: 1 };
  function resize() {
    const rect = host.getBoundingClientRect();
    size.dpr = window.devicePixelRatio || 1;
    size.w = Math.max(1, rect.width);
    size.h = Math.max(1, rect.height);
    canvas.width = Math.round(size.w * size.dpr);
    canvas.height = Math.round(size.h * size.dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    onResize?.(size.w, size.h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  return {
    canvas,
    ctx,
    size,
    /** Сбросить трансформацию под DPR и очистить — вызывать в начале кадра. */
    begin() {
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, size.w, size.h);
    },
    destroy() { ro.disconnect(); canvas.remove(); },
  };
}

/**
 * Горизонтальное управление, общее для «поймай» и «мяча»: указатель (мышь/
 * палец, в т.ч. по рамке поля) и стрелки/A-D. targetX/keyDir — в долях ширины.
 */
export function createHorizontalControl(host, canvas) {
  const st = { targetX: null, keyDir: 0 };
  function toTarget(e) {
    const rect = canvas.getBoundingClientRect();
    st.targetX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  }
  const onDown = (e) => { host.setPointerCapture?.(e.pointerId); toTarget(e); };
  const onMove = (e) => { if (e.pointerType === 'mouse' || e.buttons) toTarget(e); };
  const onLeave = (e) => { if (e.pointerType === 'mouse') st.targetX = null; };
  const held = new Set();
  const onKey = (e) => {
    const left = ['ArrowLeft', 'a', 'A', 'ф', 'Ф'].includes(e.key);
    const right = ['ArrowRight', 'd', 'D', 'в', 'В'].includes(e.key);
    if (!left && !right) return;
    e.preventDefault();
    const k = left ? 'L' : 'R';
    if (e.type === 'keydown') held.add(k); else held.delete(k);
    st.keyDir = (held.has('R') ? 1 : 0) - (held.has('L') ? 1 : 0);
    if (st.keyDir) st.targetX = null; // клавиатура перебивает указатель
  };
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerleave', onLeave);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  return {
    state: st,
    /** Сдвинуть x (доля ширины) к цели со скоростью speed долей/с, вернуть новый x. */
    step(x, dt, speed) {
      const max = speed * dt;
      if (st.keyDir) return x + st.keyDir * max;
      if (st.targetX !== null) { const d = st.targetX - x; return x + Math.sign(d) * Math.min(Math.abs(d), max); }
      return x;
    },
    destroy() {
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    },
  };
}
