// Векторные иконки нового интерфейса (раздел 2 ТЗ) — рисуются кодом, в едином
// стиле: тёмно-коричневая обводка #3B2414, градиентная заливка, светлый блик.
// Ни одной эмодзи в интерфейсе. Каждая иконка — самостоятельный inline-SVG
// (строка), готовый ко вставке через innerHTML в любой DOM-компонент.

import { TOKENS } from './theme.js';

let gradCounter = 0;

function grad(light, dark) {
  const id = `msc-grad-${gradCounter++}`;
  return {
    id,
    def: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${light}" />
      <stop offset="1" stop-color="${dark}" />
    </linearGradient>`,
  };
}

function wrap(inner, gradDefs, viewBox = '0 0 32 32') {
  return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>${gradDefs.join('')}</defs>
    ${inner}
  </svg>`;
}

const STROKE = TOKENS.ink;

/** @param {string} name одно из: star, coin, lock, check, bulb, map, postcard, shop, sound, soundOff, question, exclaim, info, liner, clock */
export function icon(name, opts = {}) {
  const fn = ICONS[name];
  if (!fn) throw new Error(`Неизвестная иконка: ${name}`);
  return fn(opts);
}

const ICONS = {
  star: () => {
    const g = grad('#FFE484', TOKENS.goldAward);
    const pts = starPoints(16, 15, 12, 5, 5);
    return wrap(
      `<polygon points="${pts}" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="1.6" stroke-linejoin="round" />
       <ellipse cx="12.5" cy="10.5" rx="3.4" ry="1.8" fill="#fff" opacity="0.45" />`,
      [g.def],
    );
  },

  coin: () => {
    const g = grad('#FFE9A3', '#E8A21C');
    return wrap(
      `<circle cx="16" cy="16" r="12.5" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" />
       <circle cx="16" cy="16" r="8.5" fill="none" stroke="${STROKE}" stroke-width="1.4" opacity="0.5" />
       <text x="16" y="21" font-size="14" font-weight="900" text-anchor="middle" fill="${STROKE}" font-family="Nunito, sans-serif">$</text>
       <ellipse cx="12" cy="11" rx="4" ry="2.2" fill="#fff" opacity="0.4" />`,
      [g.def],
    );
  },

  lock: () => {
    const g = grad('#D9CBA6', '#9A8A63');
    return wrap(
      `<rect x="8" y="15" width="16" height="13" rx="3" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" />
       <path d="M11 15v-4a5 5 0 0 1 10 0v4" fill="none" stroke="${STROKE}" stroke-width="2.2" stroke-linecap="round" />
       <circle cx="16" cy="20.5" r="2.2" fill="${STROKE}" />
       <rect x="15" y="21.5" width="2" height="3.5" fill="${STROKE}" />`,
      [g.def],
    );
  },

  check: () => {
    const g = grad('#9CF08A', TOKENS.greenDark);
    return wrap(
      `<circle cx="16" cy="16" r="13" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" />
       <path d="M10 16.5l4 4 8-9" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />`,
      [g.def],
    );
  },

  bulb: () => {
    const g = grad('#FFF3B0', '#FFC93C');
    return wrap(
      `<path d="M16 4a9 9 0 0 0-5 16.5c.9.6 1.4 1.6 1.4 2.7v.3h7.2v-.3c0-1.1.5-2.1 1.4-2.7A9 9 0 0 0 16 4z" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round" />
       <rect x="12.5" y="25.5" width="7" height="2.6" rx="1" fill="${STROKE}" />
       <rect x="13" y="28.6" width="6" height="1.8" rx="0.9" fill="${STROKE}" />
       <ellipse cx="13" cy="11" rx="2.6" ry="1.6" fill="#fff" opacity="0.55" />`,
      [g.def],
    );
  },

  map: () => {
    const g = grad('#FFF9E8', '#E8D9AE');
    return wrap(
      `<path d="M5 8l7-2.5 8 2.5 7-2.5v18l-7 2.5-8-2.5-7 2.5V8z" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round" />
       <path d="M12 5.5v18M20 8v18" stroke="${STROKE}" stroke-width="1.4" stroke-dasharray="2.4 2.4" opacity="0.6" />
       <path d="M9 12c2 3 5 3 6 6.5" fill="none" stroke="${TOKENS.redDark}" stroke-width="1.8" stroke-linecap="round" />
       <circle cx="9" cy="12" r="1.6" fill="${TOKENS.redDark}" />`,
      [g.def],
    );
  },

  postcard: () => {
    const g = grad('#FFFFFF', '#E8DEC6');
    return wrap(
      `<rect x="4" y="7" width="24" height="18" rx="2" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" />
       <path d="M4 9l12 8 12-8" fill="none" stroke="${STROKE}" stroke-width="1.6" stroke-linejoin="round" />
       <rect x="21" y="10" width="4.5" height="4.5" fill="none" stroke="${STROKE}" stroke-width="1.2" opacity="0.6" />`,
      [g.def],
    );
  },

  shop: () => {
    const g = grad('#9CF08A', TOKENS.greenDark);
    return wrap(
      `<path d="M6 12l1.6-6h16.8l1.6 6z" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round" />
       <rect x="6.5" y="12" width="19" height="13" rx="1.5" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" />
       <path d="M12 25v-6a4 4 0 0 1 8 0v6" fill="#FFF9E8" stroke="${STROKE}" stroke-width="1.8" />`,
      [g.def],
    );
  },

  sound: () => {
    const g = grad('#FFF3B0', TOKENS.goldAward);
    return wrap(
      `<path d="M6 13h4l6-5v16l-6-5H6z" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round" />
       <path d="M21 12c2 2.2 2 6 0 8.2M24.5 9c3.6 3.7 3.6 10.4 0 14.1" fill="none" stroke="${STROKE}" stroke-width="2" stroke-linecap="round" />`,
      [g.def],
    );
  },

  soundOff: () => {
    const g = grad('#E7DFD3', '#C9C3B8');
    return wrap(
      `<path d="M6 13h4l6-5v16l-6-5H6z" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round" />
       <path d="M21 12l7 8M28 12l-7 8" stroke="${TOKENS.redDark}" stroke-width="2.4" stroke-linecap="round" />`,
      [g.def],
    );
  },

  question: () => badgeSymbol(TOKENS.blue, TOKENS.blueDark, '?'),
  exclaim: () => badgeSymbol(TOKENS.orange, TOKENS.orangeDark, '!'),
  info: () => badgeSymbol('#5CD1C0', '#2AA391', 'i'),

  liner: () => {
    const g = grad('#EAF6FF', '#CFE7F5');
    return wrap(
      `<path d="M6 20h20l-2.5 5H8.5L6 20z" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round" />
       <rect x="10" y="12" width="12" height="8" rx="1" fill="#fff" stroke="${STROKE}" stroke-width="1.8" />
       <rect x="12" y="14.2" width="2.4" height="2.4" fill="${TOKENS.blue}" />
       <rect x="15.8" y="14.2" width="2.4" height="2.4" fill="${TOKENS.blue}" />
       <rect x="19.6" y="14.2" width="2.4" height="2.4" fill="${TOKENS.blue}" />
       <rect x="14.5" y="6" width="3" height="6" fill="${STROKE}" />
       <path d="M16 4l2.6 3h-5.2z" fill="${TOKENS.redDark}" stroke="${STROKE}" stroke-width="1" />
       <path d="M3 25c2 1.4 4 1.4 6 0s4-1.4 6 0 4 1.4 6 0 4-1.4 6 0" fill="none" stroke="${TOKENS.blueDark}" stroke-width="1.8" stroke-linecap="round" />`,
      [g.def],
      '0 0 32 30',
    );
  },

  clock: () => {
    const g = grad('#FFF9E8', '#E8D9AE');
    return wrap(
      `<circle cx="16" cy="17" r="12" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" />
       <path d="M16 9.5V17l5.5 3" fill="none" stroke="${STROKE}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
       <rect x="12" y="3" width="8" height="3" rx="1.4" fill="${STROKE}" />`,
      [g.def],
    );
  },

  arrow: () => {
    const g = grad('#FFF3B0', TOKENS.goldAward);
    return wrap(
      `<path d="M9 6l13 10-13 10z" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2.4" stroke-linejoin="round" />`,
      [g.def],
    );
  },
};

function badgeSymbol(light, dark, symbol) {
  const g = grad(light, dark);
  return wrap(
    `<circle cx="16" cy="16" r="13" fill="url(#${g.id})" stroke="${STROKE}" stroke-width="2" />
     <text x="16" y="21.5" font-size="16" font-weight="900" text-anchor="middle" fill="#fff" stroke="${STROKE}" stroke-width="0.6" font-family="Nunito, sans-serif">${symbol}</text>
     <ellipse cx="12" cy="11" rx="3.6" ry="2" fill="#fff" opacity="0.4" />`,
    [g.def],
  );
}

function starPoints(cx, cy, rOuter, rInner, points) {
  const step = Math.PI / points;
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = i * step - Math.PI / 2;
    out.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return out.join(' ');
}
