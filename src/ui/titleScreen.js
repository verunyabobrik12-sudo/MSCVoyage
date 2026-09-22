// Титульный экран (раздел 3.1 ТЗ этапа 2). Целиком HTML/CSS/SVG — это не мир
// игры, а экран, так что весь раздел 0 про "мир на canvas" его не касается:
// проще и чётче нарисовать код фон/лайнер/облака в DOM, чем городить ещё один
// canvas поверх основного.

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

const CLOUDS = [
  { top: '8%', left: '10%', w: 90, h: 36 },
  { top: '14%', left: '55%', w: 130, h: 46 },
  { top: '6%', left: '72%', w: 70, h: 28 },
  { top: '20%', left: '30%', w: 60, h: 24 },
];

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

  for (const c of CLOUDS) {
    const cloud = el('div', 'msc-title-cloud');
    Object.assign(cloud.style, { top: c.top, left: c.left, width: `${c.w}px`, height: `${c.h}px` });
    root.appendChild(cloud);
  }

  root.appendChild(el('div', 'msc-title-sea'));
  root.appendChild(el('div', 'msc-title-wave msc-title-wave--back'));
  root.appendChild(el('div', 'msc-title-wave msc-title-wave--front'));

  const liner = el('div', 'msc-title-liner', { html: icon('liner') });
  root.appendChild(liner);

  if (heroSprite) {
    const hero = el('div', 'msc-title-hero');
    const scale = 128 / heroSprite.frameWidth;
    hero.style.backgroundImage = `url(${heroSprite.sheetSrc})`;
    hero.style.backgroundSize = `${heroSprite.sheetWidth * scale}px ${heroSprite.sheetHeight * scale}px`;
    hero.style.backgroundPosition = `${-heroSprite.frameX * scale}px ${-heroSprite.frameY * scale}px`;
    root.appendChild(hero);
  }

  const soundBtn = el('button', 'msc-hud-round-btn msc-btn msc-title-sound', { type: 'button', 'aria-label': 'Звук' });
  soundBtn.innerHTML = icon(muted ? 'soundOff' : 'sound');
  soundBtn.addEventListener('click', () => onToggleSound?.(soundBtn));
  root.appendChild(soundBtn);

  const content = el('div', 'msc-title-content');
  const banner = el('div', 'msc-title-banner');
  banner.appendChild(createRibbon(STRINGS.title.name));
  banner.appendChild(el('div', 'msc-title-subtitle', { text: STRINGS.title.subtitle }));
  content.appendChild(banner);

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
