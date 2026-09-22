// Мост между IllustratedScene (мир на canvas) и HTML/CSS-окнами "Да/Нет" и
// облачком факта (раздел 3.4 ТЗ этапа 2). Сцена дожидается Promise, сама не
// знает, что окно — это DOM, а не canvas: единственная точка интеграции.

import { createPanel, createRibbon, createButton, createModal } from './components.js';
import { STRINGS } from '../data/strings.ru.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * @param {HTMLElement} container обычно #ui-layer
 * @param {{onOpen?:Function, onClose?:Function}} hooks HUD затемняется, пока открыто любое окно (раздел 3.3/4)
 */
export function createDialogAdapter(container, hooks = {}) {
  const { onOpen, onClose } = hooks;
  return {
    /** Окно "Да/Нет" — выезжает снизу-по-центру, сцена под ним остаётся видна (раздел 3.4). */
    showConfirm({ title, message }) {
      onOpen?.();
      return new Promise((resolve) => {
        const { el: panel, body } = createPanel();
        if (title) body.appendChild(createRibbon(title, { wrap: true }));
        body.appendChild(el('p', 'msc-dialog-text', message));
        const actions = el('div', 'msc-dialog-actions');
        const yesBtn = createButton({ label: STRINGS.doors.yes, variant: 'green' });
        const noBtn = createButton({ label: STRINGS.doors.no, variant: 'red' });
        actions.appendChild(yesBtn.el);
        actions.appendChild(noBtn.el);
        body.appendChild(actions);

        const modal = createModal({
          bodyEl: panel,
          container,
          dock: true,
          labelledBy: null,
          onRequestClose: () => finish('no'),
        });

        let settled = false;
        function finish(action) {
          if (settled) return;
          settled = true;
          modal.close();
          onClose?.();
          resolve(action);
        }
        yesBtn.button.addEventListener('click', () => finish('yes'));
        noBtn.button.addEventListener('click', () => finish('no'));
        modal.open();
      });
    },

    /** Облачко с фактом у информационных точек — без кнопок, тап по себе или 4с (раздел 3.4). */
    showInfo({ title, fact, durationMs = 4000 }) {
      onOpen?.();
      return new Promise((resolve) => {
        const { el: panel, body } = createPanel({ className: 'msc-info-bubble msc-pop' });
        if (title) body.appendChild(createRibbon(title, { wrap: true }));
        body.appendChild(el('p', 'msc-dialog-text', fact));
        panel.setAttribute('role', 'note');
        panel.setAttribute('tabindex', '0');
        container.appendChild(panel);

        let settled = false;
        let timer = null;
        function finish() {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          panel.classList.add('is-closing');
          setTimeout(() => { panel.remove(); onClose?.(); resolve(); }, 250);
        }
        panel.addEventListener('click', finish);
        panel.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); finish(); }
        });
        panel.focus();
        timer = setTimeout(finish, durationMs);
      });
    },
  };
}
