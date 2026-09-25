// Альбом открыток (кнопка «Открытки» в HUD, раздел 3.9). Сетка из пяти
// открыток: полученные — цветные, с подписью, по тапу открываются крупно;
// неполученные — серые под замком, с подсказкой, где их взять.

import { createPanel, createRibbon, createButton, createModal, createCloseButton } from './components.js';
import { icon } from './icons.js';
import { POSTCARDS } from '../data/postcards.js';
import { Storage } from '../engine/storage.js';
import { Sound } from '../engine/sound.js';

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
 * @param {{container:HTMLElement, onFinale?:Function, onClose?:Function}} opts
 *   onFinale — показать кнопку «Итоги путешествия», когда собраны все открытки.
 */
export function openPostcards({ container, onFinale, onClose }) {
  const { el: panel, body } = createPanel({ className: 'msc-postcards-panel' });
  const stage = el('div', 'msc-postcards-stage');
  body.appendChild(stage);
  panel.appendChild(createCloseButton({ onClick: () => modal.close() }));
  const modal = createModal({ bodyEl: panel, container, full: true, onRequestClose: () => modal.close(), onClose });

  function renderGrid() {
    stage.innerHTML = '';
    const owned = Storage.get().postcards;
    const count = POSTCARDS.filter((p) => owned[p.id]).length;
    stage.appendChild(createRibbon('Открытки'));
    stage.appendChild(el('p', 'msc-postcards-counter', { text: `Собрано ${count} из ${POSTCARDS.length}` }));

    const grid = el('div', 'msc-postcards-grid');
    for (const p of POSTCARDS) {
      const has = !!owned[p.id];
      const card = el(has ? 'button' : 'div', `msc-postcard ${has ? 'is-owned' : 'is-locked'}`, has ? { type: 'button', 'aria-label': `Открыть открытку «${p.title}»` } : {});
      const pic = el('div', 'msc-postcard__pic');
      pic.appendChild(el('img', null, { src: p.image, alt: '', loading: 'lazy' }));
      if (!has) pic.appendChild(el('span', 'msc-postcard__lock', { html: icon('lock') }));
      card.appendChild(pic);
      card.appendChild(el('div', 'msc-postcard__title', { text: p.title }));
      card.appendChild(el('div', 'msc-postcard__note', { text: has ? p.caption : p.hint }));
      if (has) card.addEventListener('click', () => { Sound.click(); renderOne(p); });
      grid.appendChild(card);
    }
    stage.appendChild(grid);

    if (count === POSTCARDS.length && onFinale) {
      const btn = createButton({ label: 'Итоги путешествия', variant: 'orange', size: 'l' });
      btn.button.addEventListener('click', () => { modal.close(); onFinale(); });
      btn.el.classList.add('msc-postcards-finale-btn');
      stage.appendChild(btn.el);
    }
  }

  function renderOne(p) {
    stage.innerHTML = '';
    const big = el('figure', 'msc-postcard-big');
    big.appendChild(el('img', null, { src: p.image, alt: p.caption }));
    const cap = el('figcaption');
    cap.appendChild(el('div', 'msc-postcard-big__title', { text: p.title }));
    cap.appendChild(el('div', 'msc-postcard-big__caption', { text: p.caption }));
    big.appendChild(cap);
    stage.appendChild(big);
    const back = createButton({ label: 'Все открытки', variant: 'blue' });
    back.button.addEventListener('click', () => { Sound.click(); renderGrid(); });
    stage.appendChild(back.el);
    back.button.focus();
  }

  modal.open();
  renderGrid();
}
