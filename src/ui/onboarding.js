// Обучение «Добро пожаловать на борт» (раздел 3.2 ТЗ этапа 2). Три шага в
// SpeechBubble с портретом героини, показывается один раз (Storage.tutorialSeen),
// потом доступно из «Как играть» в титульном экране/меню.

import { createSpeechBubble, createProgressDots, createButton } from './components.js';
import { STRINGS } from '../data/strings.ru.js';
import { buildPortraitImg } from './heroPortrait.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const STEPS = [STRINGS.tutorial.step1, STRINGS.tutorial.step2, STRINGS.tutorial.step3];

/** @param {{container:HTMLElement, heroPortrait:object, onDone:Function}} opts */
export function createOnboarding({ container, heroPortrait, onDone } = {}) {
  const root = el('div', 'msc-onboarding msc-root');
  const layout = el('div', 'msc-onboarding__layout');

  const portrait = el('div', 'msc-onboarding__portrait');
  if (heroPortrait) portrait.appendChild(buildPortraitImg(heroPortrait, 96));

  const textEl = el('p', 'msc-dialog-text', STEPS[0]);
  textEl.style.margin = '4px 0 0';
  const bubble = createSpeechBubble({ bodyEl: textEl, tailSide: 'left' });

  const dotsWrap = createProgressDots(STEPS.length, 0);

  const footer = el('div', 'msc-onboarding__footer');
  const skipBtn = createButton({ label: STRINGS.tutorial.skip, variant: 'red', size: 's' });
  const nextBtn = createButton({ label: STRINGS.tutorial.next, variant: 'green', size: 'm' });
  footer.appendChild(skipBtn.el);
  footer.appendChild(dotsWrap);
  footer.appendChild(nextBtn.el);

  layout.appendChild(portrait);
  layout.appendChild(bubble);
  layout.appendChild(footer);
  root.appendChild(layout);
  container.appendChild(root);

  let step = 0;
  function render() {
    textEl.textContent = STEPS[step];
    const dots = dotsWrap.querySelectorAll('.msc-progress-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-done', i < step);
      dot.classList.toggle('is-current', i === step);
    });
    nextBtn.el.querySelector('.msc-btn__label').textContent = step === STEPS.length - 1 ? STRINGS.tutorial.start : STRINGS.tutorial.next;
  }

  function finish() {
    root.remove();
    onDone?.();
  }

  nextBtn.button.addEventListener('click', () => {
    if (step >= STEPS.length - 1) { finish(); return; }
    step += 1;
    render();
  });
  skipBtn.button.addEventListener('click', finish);

  document.addEventListener('keydown', function onKey(e) {
    if (!root.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
  });

  render();
  nextBtn.button.focus();

  return { el: root };
}
