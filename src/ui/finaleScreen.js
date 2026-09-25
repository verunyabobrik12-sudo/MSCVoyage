// Финальный экран (раздел 3.11): показывается один раз, когда пройдены все
// задания (викторины + мини-игры); повторно — из альбома открыток кнопкой
// «Итоги путешествия». Звание по баллам, собранные открытки, компании и
// контакты агентства. Пустые поля контактов (CONFIG.contacts) не показываются.

import { createPanel, createRibbon, createButton, createModal, spawnConfetti } from './components.js';
import { icon } from './icons.js';
import { CONFIG } from '../data/config.js';
import { STRINGS } from '../data/strings.ru.js';
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

export function rankFor(points) {
  let title = CONFIG.ranks[0].title;
  for (const r of CONFIG.ranks) if (points >= r.minScore) title = r.title;
  return title;
}

/** @param {{container:HTMLElement, onPostcards?:Function, onClose?:Function}} opts */
export function openFinale({ container, onPostcards, onClose }) {
  const s = Storage.get();
  const { el: panel, body } = createPanel({ className: 'msc-finale-panel' });
  const stage = el('div', 'msc-finale-stage');
  body.appendChild(stage);
  const modal = createModal({ bodyEl: panel, container, full: true, onClose });

  stage.appendChild(createRibbon('Круиз завершён!'));
  stage.appendChild(el('p', 'msc-finale-lead', { text: 'Вы прошли все задания путешествия. Спасибо, что были с нами!' }));

  const stats = el('div', 'msc-finale-stats');
  const rank = el('div', 'msc-finale-stat');
  rank.appendChild(el('span', 'msc-finale-stat__icon', { html: icon('star') }));
  rank.appendChild(el('span', 'msc-finale-stat__label', { text: 'Звание' }));
  rank.appendChild(el('span', 'msc-finale-stat__value', { text: rankFor(s.points) }));
  const pts = el('div', 'msc-finale-stat');
  pts.appendChild(el('span', 'msc-finale-stat__icon', { html: icon('coin') }));
  pts.appendChild(el('span', 'msc-finale-stat__label', { text: 'Баллы' }));
  pts.appendChild(el('span', 'msc-finale-stat__value', { text: String(s.points) }));
  stats.appendChild(rank);
  stats.appendChild(pts);
  stage.appendChild(stats);

  const strip = el('div', 'msc-finale-postcards', { 'aria-label': 'Собранные открытки' });
  for (const p of POSTCARDS) {
    const img = el('img', s.postcards[p.id] ? '' : 'is-locked', { src: p.image, alt: p.title, title: p.title });
    strip.appendChild(img);
  }
  stage.appendChild(strip);

  // Компании — тем же «маркером», что и на заставке
  stage.appendChild(el('div', 'msc-finale-partners', { text: STRINGS.title.partners }));

  const c = CONFIG.contacts;
  const rows = [
    c.phone && { icon: 'phone', text: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, '')}` },
    c.site && { icon: 'map', text: c.site, href: /^https?:/.test(c.site) ? c.site : `https://${c.site}` },
    c.social && { icon: 'postcard', text: c.social },
  ].filter(Boolean);
  if (c.company || rows.length) {
    const box = el('div', 'msc-finale-contacts');
    box.appendChild(el('div', 'msc-finale-contacts__title', { text: 'Хотите в настоящий круиз?' }));
    if (c.company) box.appendChild(el('div', 'msc-finale-contacts__company', { text: c.company }));
    for (const r of rows) {
      const line = el(r.href ? 'a' : 'div', 'msc-finale-contacts__row', r.href ? { href: r.href, ...(r.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {}) } : {});
      line.appendChild(el('span', 'msc-finale-contacts__icon', { html: icon(r.icon) }));
      line.appendChild(el('span', null, { text: r.text }));
      box.appendChild(line);
    }
    if (c.promoCode) {
      const promo = el('div', 'msc-finale-promo');
      promo.appendChild(el('span', null, { text: 'Промокод:' }));
      promo.appendChild(el('b', null, { text: c.promoCode }));
      box.appendChild(promo);
    }
    stage.appendChild(box);
  }

  const actions = el('div', 'msc-dialog-actions');
  const cards = createButton({ label: 'Открытки', variant: 'blue', size: 'l' });
  const cont = createButton({ label: 'Продолжить', variant: 'green', size: 'l' });
  cards.button.addEventListener('click', () => { modal.close(); onPostcards?.(); });
  cont.button.addEventListener('click', () => modal.close());
  actions.appendChild(cards.el);
  actions.appendChild(cont.el);
  stage.appendChild(actions);

  modal.open();
  Sound.points();
  spawnConfetti(stage, { count: 30 });
  cont.button.focus();
}
