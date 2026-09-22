// HUD в игре (раздел 3.3 ТЗ этапа 2). Обычный DOM поверх canvas — см. theme.js
// за объяснением выбора. Не покрывает горячие точки/выходы: нижняя панель
// собрана так, чтобы её высота не превышала ~12% экрана (ограничено в CSS).

import { createPointsBadge, createProgressBar, createIconButton } from './components.js';
import { icon } from './icons.js';
import { STRINGS } from '../data/strings.ru.js';
import { buildPortraitImg } from './heroPortrait.js';

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  return node;
}

/**
 * @param {{container: HTMLElement, heroPortrait: {sheetSrc:string, frameWidth:number, frameHeight:number, sheetWidth:number, sheetHeight:number, frameX:number, frameY:number}, points:number, onOpenMap:Function, onOpenPostcards:Function, onOpenShop:Function, onOpenMenu:Function, onToggleSound:Function, muted:boolean}} opts
 */
export function createHud({
  container,
  heroPortrait,
  points = 0,
  progressPercent = 0,
  muted = false,
  onOpenMap,
  onOpenPostcards,
  onOpenShop,
  onOpenMenu,
  onToggleSound,
} = {}) {
  const root = el('div', 'msc-hud msc-root');

  // ---- верх: портрет + прогресс слева, баллы + звук + меню справа ----
  const top = el('div', 'msc-hud-top');

  const portraitWrap = el('div', 'msc-hud-portrait-wrap');
  const portrait = el('div', 'msc-hud-portrait');
  if (heroPortrait) portrait.appendChild(buildPortraitImg(heroPortrait, 52));
  const progressWrap = el('div', 'msc-hud-progress-wrap');
  progressWrap.appendChild(el('span', 'msc-hud-progress-label', { text: STRINGS.hud.cruiseExpert }));
  const progressBar = createProgressBar(progressPercent);
  progressWrap.appendChild(progressBar.el);
  portraitWrap.appendChild(portrait);
  portraitWrap.appendChild(progressWrap);

  const topRight = el('div', 'msc-hud-top-right');
  const pointsBadge = createPointsBadge(points, { onClick: () => onOpenShop?.() });
  const soundBtn = el('button', 'msc-hud-round-btn msc-btn', { type: 'button', 'aria-label': 'Звук' });
  soundBtn.innerHTML = icon(muted ? 'soundOff' : 'sound');
  soundBtn.addEventListener('click', () => onToggleSound?.());
  const menuBtn = el('button', 'msc-hud-round-btn msc-btn', { type: 'button', 'aria-label': STRINGS.menu.title });
  menuBtn.innerHTML = '<span class="msc-outline-text" style="font-size:20px;color:#3B2414;-webkit-text-stroke:0;">⚙</span>';
  menuBtn.addEventListener('click', () => onOpenMenu?.());
  topRight.appendChild(pointsBadge.el);
  topRight.appendChild(soundBtn);
  topRight.appendChild(menuBtn);

  top.appendChild(portraitWrap);
  top.appendChild(topRight);

  // ---- низ: текущая цель слева, три круглые кнопки справа ----
  const bottom = el('div', 'msc-hud-bottom');
  const goal = el('div', 'msc-hud-goal');
  const goalIcon = el('span', 'msc-hud-goal__icon', { html: '' });
  goalIcon.innerHTML = icon('info');
  const goalText = el('span', 'msc-hud-goal__text', { text: '' });
  goal.appendChild(goalIcon);
  goal.appendChild(goalText);

  const actions = el('div', 'msc-hud-actions');
  actions.appendChild(createIconButton({ iconName: 'map', label: STRINGS.hud.map, onClick: () => onOpenMap?.(), variant: 'blue' }));
  actions.appendChild(createIconButton({ iconName: 'postcard', label: STRINGS.hud.postcards, onClick: () => onOpenPostcards?.(), variant: 'blue' }));
  actions.appendChild(createIconButton({ iconName: 'shop', label: STRINGS.hud.shop, onClick: () => onOpenShop?.(), variant: 'green' }));

  bottom.appendChild(goal);
  bottom.appendChild(actions);

  root.appendChild(top);
  root.appendChild(bottom);
  container.appendChild(root);

  function setGoal(text, iconName = 'info') {
    if (goalText.textContent === text) return;
    goalText.textContent = text;
    goalIcon.innerHTML = icon(iconName);
    goal.classList.remove('goal-flash');
    void goal.offsetWidth;
    goal.classList.add('goal-flash');
  }

  function setPoints(n) { pointsBadge.setPoints(n); }
  function setProgress(pct) { progressBar.setProgress(pct); }
  function setMuted(isMuted) { soundBtn.innerHTML = icon(isMuted ? 'soundOff' : 'sound'); }
  function setDimmed(isDimmed) {
    top.classList.toggle('is-dimmed', isDimmed);
    bottom.classList.toggle('is-dimmed', isDimmed);
  }
  function setVisible(visible) { root.classList.toggle('msc-hidden', !visible); }

  return { el: root, pointsBadge: pointsBadge.el, setGoal, setPoints, setProgress, setMuted, setDimmed, setVisible };
}
