// «Магазин» (кнопка в HUD и табличка баллов, раздел 3.7): экскурсии за баллы.
// Купленная — с лентой «Куплено»; на недоступную показываем, сколько не хватает.

import { createPanel, createRibbon, createButton, createModal, createCloseButton, createCard, spawnConfetti } from './components.js';
import { icon } from './icons.js';
import { EXCURSIONS } from '../data/excursions.js';
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

/** @param {{container:HTMLElement, onPointsChanged:(n:number)=>void, onClose?:Function}} opts */
export function openShop({ container, onPointsChanged, onClose }) {
  const { el: panel, body } = createPanel({ className: 'msc-shop-panel' });
  const stage = el('div', 'msc-shop-stage');
  body.appendChild(stage);
  panel.appendChild(createCloseButton({ onClick: () => modal.close() }));
  const modal = createModal({ bodyEl: panel, container, full: true, onRequestClose: () => modal.close(), onClose });

  function render() {
    const scrollTop = stage.scrollTop;
    stage.innerHTML = '';
    const s = Storage.get();
    stage.appendChild(createRibbon('Экскурсии'));
    const balance = el('div', 'msc-shop-balance');
    balance.appendChild(el('span', 'msc-shop-balance__icon', { html: icon('coin') }));
    balance.appendChild(el('span', null, { text: `У вас ${s.points} баллов` }));
    stage.appendChild(balance);

    const list = el('div', 'msc-shop-list');
    for (const x of EXCURSIONS) {
      const bought = !!s.purchasedExcursions[x.id];
      const footer = el('div', 'msc-shop-footer');
      const price = el('span', 'msc-card__price');
      price.innerHTML = icon('coin');
      price.appendChild(el('span', null, { text: String(x.price) }));
      footer.appendChild(price);
      if (!bought) {
        const lack = x.price - s.points;
        if (lack > 0) {
          footer.appendChild(el('span', 'msc-shop-lack', { text: `Не хватает ${lack}` }));
        } else {
          const buy = createButton({ label: 'Купить', variant: 'green', size: 's' });
          buy.button.addEventListener('click', () => {
            Storage.addPoints(-x.price);
            Storage.purchaseExcursion(x.id);
            Sound.points();
            onPointsChanged?.(Storage.get().points);
            render();
            spawnConfetti(stage, { count: 14 });
          });
          footer.appendChild(buy.el);
        }
      }
      const img = el('img', 'msc-shop-img', { src: x.image, alt: '', loading: 'lazy' });
      const card = createCard({ imageContent: img, title: x.title, desc: x.desc, footer, purchased: bought });
      card.classList.add('msc-shop-card');
      if (bought) card.classList.add('is-bought');
      list.appendChild(card);
    }
    stage.appendChild(list);
    stage.scrollTop = scrollTop;
  }

  modal.open();
  render();
}
