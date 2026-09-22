// Меню "⚙" из HUD (раздел 3.10 ТЗ — здесь только базовый набор, нужный чтобы
// кнопка в HUD не была мёртвой; полноценный экран настроек — отдельный шаг).

import { createPanel, createRibbon, createButton, createModal } from './components.js';
import { STRINGS } from '../data/strings.ru.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * @param {{container:HTMLElement, muted:boolean, onToggleSound:Function, onHowToPlay:Function, onNewGame:Function, onMainMenu:Function, onClose:Function}} opts
 */
export function openMenu({ container, muted, onToggleSound, onHowToPlay, onNewGame, onMainMenu, onClose }) {
  const { el: panel, body } = createPanel();
  body.appendChild(createRibbon(STRINGS.menu.title));

  const list = el('div', 'msc-menu-list');
  const continueBtn = createButton({ label: STRINGS.menu.continue, variant: 'green' });
  const soundBtn = createButton({ label: muted ? STRINGS.menu.soundOff : STRINGS.menu.soundOn, variant: 'blue' });
  const howToBtn = createButton({ label: STRINGS.menu.howToPlay, variant: 'blue' });
  const newGameBtn = createButton({ label: STRINGS.menu.newGame, variant: 'orange' });
  const mainMenuBtn = createButton({ label: STRINGS.menu.mainMenu, variant: 'red' });
  [continueBtn, soundBtn, howToBtn, newGameBtn, mainMenuBtn].forEach((b) => list.appendChild(b.el));
  body.appendChild(list);

  const modal = createModal({ bodyEl: panel, container, onClose });

  continueBtn.button.addEventListener('click', () => modal.close());
  soundBtn.button.addEventListener('click', () => {
    onToggleSound?.();
    const nowMuted = !muted;
    muted = nowMuted;
    soundBtn.el.querySelector('.msc-btn__label').textContent = nowMuted ? STRINGS.menu.soundOff : STRINGS.menu.soundOn;
  });
  howToBtn.button.addEventListener('click', () => { modal.close(); onHowToPlay?.(); });
  newGameBtn.button.addEventListener('click', () => {
    confirmInline(newGameBtn.el, STRINGS.menu.newGameConfirm, () => { modal.close(); onNewGame?.(); });
  });
  mainMenuBtn.button.addEventListener('click', () => {
    confirmInline(mainMenuBtn.el, STRINGS.menu.mainMenuConfirm, () => { modal.close(); onMainMenu?.(); });
  });

  function confirmInline(anchor, message, onYes) {
    if (anchor.querySelector('.msc-menu-confirm')) return;
    const box = el('div', 'msc-menu-confirm');
    box.style.cssText = 'margin-top:10px;padding:10px;border-radius:10px;background:rgba(217,58,43,.12);';
    box.appendChild(el('p', 'msc-dialog-text', message)).style.margin = '0 0 10px';
    const row = el('div', 'msc-dialog-actions');
    const yes = createButton({ label: STRINGS.doors.yes, variant: 'red', size: 's' });
    const no = createButton({ label: STRINGS.doors.no, variant: 'green', size: 's' });
    yes.button.addEventListener('click', onYes);
    no.button.addEventListener('click', () => box.remove());
    row.appendChild(yes.el);
    row.appendChild(no.el);
    box.appendChild(row);
    anchor.appendChild(box);
  }

  modal.open();
  return modal;
}
