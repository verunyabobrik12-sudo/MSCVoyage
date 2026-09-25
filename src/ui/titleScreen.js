// Титульный экран (раздел 3.1 ТЗ этапа 2). HTML/CSS поверх canvas: фон —
// готовая иллюстрация (assets/title/title_bg.jpg, лайнер у берегов Рима),
// поверх — логотип и кнопки. Героиня на заставке убрана по её решению
// (2026-09-25); лента-«баннер» с названием заменена логотипом.

import { createButton } from './components.js';
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
 * @param {{container:HTMLElement, hasSave:boolean, muted:boolean, onPlay:Function, onNewGame:Function, onHowToPlay:Function, onToggleSound:Function}} opts
 */
export function createTitleScreen({
  container,
  hasSave = false,
  muted = false,
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
  // Логотип: «MSC» мелко с линиями, «VOYAGE» крупно (обводка — отдельный слой
  // ::before под заливкой, иначе градиент через background-clip не дружит
  // с -webkit-text-stroke), подзаголовок на плашке.
  const [brand, ...rest] = STRINGS.title.name.split(' ');
  const word = rest.join(' ') || brand;
  const logo = el('div', 'msc-logo', { role: 'heading', 'aria-level': '1', 'aria-label': STRINGS.title.name });
  const brandRow = el('div', 'msc-logo__brand', { 'aria-hidden': 'true' });
  brandRow.appendChild(el('span', 'msc-logo__line'));
  brandRow.appendChild(el('span', 'msc-logo__brand-text', { text: rest.length ? brand : '' }));
  brandRow.appendChild(el('span', 'msc-logo__line'));
  logo.appendChild(brandRow);
  const wordEl = el('div', 'msc-logo__word', { 'data-text': word, 'aria-hidden': 'true' });
  wordEl.appendChild(el('span', 'msc-logo__fill', { text: word }));
  logo.appendChild(wordEl);
  logo.appendChild(el('div', 'msc-logo__subtitle', { text: STRINGS.title.subtitle }));
  logo.appendChild(el('div', 'msc-logo__partners', { text: STRINGS.title.partners }));
  content.appendChild(logo);

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
