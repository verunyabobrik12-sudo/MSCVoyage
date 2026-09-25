// Карта (кнопка «Карта» в HUD, раздел 3.8): локации лайнера и берега,
// задания в каждой с отметкой «пройдено», «Вы здесь» и быстрый переход по
// тапу. Данные о локациях собирает illustratedBootstrap (разметка сцен +
// прогресс) — сам экран про сцены и Storage ничего не знает.

import { createPanel, createRibbon, createModal, createCloseButton } from './components.js';
import { icon } from './icons.js';
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
 * @param {{container:HTMLElement, groups:{title:string, places:{id,label,thumb,current,tasks:{label,done}[],infoCount}[]}[],
 *          onTravel:(id:string)=>void, onClose?:Function}} opts
 */
export function openMap({ container, groups, onTravel, onClose }) {
  const { el: panel, body } = createPanel({ className: 'msc-map-panel' });
  const stage = el('div', 'msc-map-stage');
  body.appendChild(stage);
  panel.appendChild(createCloseButton({ onClick: () => modal.close() }));
  const modal = createModal({ bodyEl: panel, container, full: true, onRequestClose: () => modal.close(), onClose });

  stage.appendChild(createRibbon('Карта'));
  stage.appendChild(el('p', 'msc-map-hint', { text: 'Нажмите на место, чтобы перейти туда' }));

  for (const g of groups) {
    stage.appendChild(el('div', 'msc-map-group', { text: g.title }));
    const list = el('div', 'msc-map-list');
    for (const p of g.places) {
      const card = el('button', `msc-map-place${p.current ? ' is-current' : ''}`, { type: 'button', 'aria-label': p.current ? `${p.label} — вы здесь` : `Перейти: ${p.label}` });
      const pic = el('div', 'msc-map-place__pic');
      pic.appendChild(el('img', null, { src: p.thumb, alt: '', loading: 'lazy' }));
      if (p.current) pic.appendChild(el('span', 'msc-map-place__here', { text: 'Вы здесь' }));
      card.appendChild(pic);
      const info = el('div', 'msc-map-place__info');
      info.appendChild(el('div', 'msc-map-place__name', { text: p.label }));
      for (const t of p.tasks) {
        const row = el('div', `msc-map-task${t.done ? ' is-done' : ''}`);
        row.appendChild(el('span', 'msc-map-task__icon', { html: icon(t.done ? 'check' : 'star') }));
        row.appendChild(el('span', null, { text: t.label }));
        info.appendChild(row);
      }
      if (p.infoCount) info.appendChild(el('div', 'msc-map-place__extra', { text: `Интересных мест: ${p.infoCount}` }));
      if (!p.tasks.length && !p.infoCount) info.appendChild(el('div', 'msc-map-place__extra', { text: 'Двери во все уголки лайнера' }));
      card.appendChild(info);
      card.addEventListener('click', () => {
        Sound.click();
        modal.close();
        if (!p.current) onTravel(p.id);
      });
      list.appendChild(card);
    }
    stage.appendChild(list);
  }

  modal.open();
}
