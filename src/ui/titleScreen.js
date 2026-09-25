// Титульный экран (раздел 3.1 ТЗ этапа 2). HTML/CSS поверх canvas: фон —
// готовая иллюстрация (assets/title/title_bg.jpg, лайнер у берегов Рима),
// поверх — название, героиня и кнопки. Нарисованные кодом облака/волны/лайнер
// убраны 2026-09-25 (они есть на иллюстрации).

import { createRibbon, createButton } from './components.js';
import { icon } from './icons.js';
import { STRINGS } from '../data/strings.ru.js';

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
 * @param {{container:HTMLElement, hasSave:boolean, muted:boolean, heroSprite:{sheetSrc,frameWidth,frameHeight,sheetWidth,sheetHeight,frameX,frameY}, onPlay:Function, onNewGame:Function, onHowToPlay:Function, onToggleSound:Function}} opts
 */
export function createTitleScreen({
  container,
  hasSave = false,
  muted = false,
  heroSprite,
  onPlay,
  onNewGame,
  onHowToPlay,
  onToggleSound,
} = {}) {
  const root = el('div', 'msc-title-screen msc-root');

  const soundBtn = el('button', 'msc-hud-round-btn msc-btn msc-title-sound', { type: 'button', 'aria-label': 'Звук' });
  soundBtn.innerHTML = icon(muted ? 'soundOff' : 'sound');
  soundBtn.addEventListener('click', () => onToggleSound?.(soundBtn));
  root.appendChild(soundBtn);

  const content = el('div', 'msc-title-content');
  const banner = el('div', 'msc-title-banner');
  banner.appendChild(createRibbon(STRINGS.title.name));
  banner.appendChild(el('div', 'msc-title-subtitle', { text: STRINGS.title.subtitle }));
  content.appendChild(banner);

  // Героиня стоит слева, ноги прячутся за кнопкой «Играть» — на иллюстрации
  // внизу море, и без этого она «висит» над водой. Размер — от высоты экрана
  // (CSS), поэтому фон спрайта задан в процентах, а не в пикселях.
  if (heroSprite) {
    const hero = el('div', 'msc-title-hero');
    const cols = heroSprite.sheetWidth / heroSprite.frameWidth;
    const rows = heroSprite.sheetHeight / heroSprite.frameHeight;
    const col = heroSprite.frameX / heroSprite.frameWidth;
    const row = heroSprite.frameY / heroSprite.frameHeight;
    hero.style.backgroundImage = `url(${heroSprite.sheetSrc})`;
    hero.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
    hero.style.backgroundPosition = `${cols > 1 ? (col / (cols - 1)) * 100 : 0}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`;
    hero.style.aspectRatio = `${heroSprite.frameWidth} / ${heroSprite.frameHeight}`;
    content.appendChild(hero);
  }

  const buttons = el('div', 'msc-title-buttons');
  if (hasSave) {
    const row = el('div', 'msc-title-secondary-row');
    row.appendChild(createButton({ label: STRINGS.title.continueGame, variant: 'green', size: 'l', onClick: () => onPlay?.() }).el);
    buttons.appendChild(row);
    const row2 = el('div', 'msc-title-secondary-row');
    row2.appendChild(createButton({ label: STRINGS.title.newGame, variant: 'orange', size: 's', onClick: () => onNewGame?.() }).el);
    row2.appendChild(createButton({ label: STRINGS.title.howToPlay, variant: 'blue', size: 's', icon: 'question', onClick: () => onHowToPlay?.() }).el);
    buttons.appendChild(row2);
  } else {
    buttons.appendChild(createButton({ label: STRINGS.title.play, variant: 'green', size: 'l', onClick: () => onPlay?.() }).el);
    buttons.appendChild(createButton({ label: STRINGS.title.howToPlay, variant: 'blue', icon: 'question', onClick: () => onHowToPlay?.() }).el);
  }
  content.appendChild(buttons);
  root.appendChild(content);

  container.appendChild(root);

  function setMuted(isMuted) { soundBtn.innerHTML = icon(isMuted ? 'soundOff' : 'sound'); }
  function remove() { root.remove(); }

  return { el: root, setMuted, remove };
}
