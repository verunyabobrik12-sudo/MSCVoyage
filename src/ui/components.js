// UI-компоненты нового интерфейса (этап 2). Раньше здесь были canvas-примитивы
// временного интерфейса этапа 1 (drawPanel/drawButton/...) — они рисовали окна
// "Да/Нет" прямо на канвасе; с переходом на HTML/CSS-слой (см. theme.js) окна
// стали обычным DOM, и та реализация вместе с src/ui/dialogs.js, который был
// её единственным потребителем, удалена как более не используемая.

// =============================================================================
// ЭТАП 2 — новый HTML/CSS-слой окон и экранов (раздел 2 ТЗ). Всё ниже создаёт
// обычные DOM-узлы (а не рисует на канвасе) — см. объяснение выбора в theme.js.
// Функции — фабрики: создают и возвращают элемент (плюс небольшой API там, где
// нужно менять состояние после создания), а не управляют разметкой сами по
// себе снаружи. Стили — классы msc-* из injectDesignSystem() в theme.js.
// =============================================================================

import { icon } from './icons.js';

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

/** Кремовая панель с двойной рамкой и бликом (раздел 1). Возвращает {el, body}. */
export function createPanel({ className = '', radius } = {}) {
  const root = el('div', `msc-panel ${className}`.trim());
  if (radius) root.style.borderRadius = `${radius + 4}px`;
  const inner = el('div', 'msc-panel__inner');
  if (radius) inner.style.borderRadius = `${radius}px`;
  const body = el('div', 'msc-panel__body');
  inner.appendChild(body);
  root.appendChild(inner);
  return { el: root, body };
}

/** Лента-заголовок с загнутыми уголками. */
export function createRibbon(text, { wrap = false, className = '' } = {}) {
  const root = el('div', `msc-ribbon ${wrap ? 'msc-ribbon--wrap' : ''} ${className}`.trim());
  const span = el('span', 'msc-ribbon__text msc-outline-text', { text });
  root.appendChild(span);
  return root;
}

/**
 * Объёмная кнопка. variant: green|orange|blue|red. size: l|m|s.
 * disabled + reason рисует причину под кнопкой (раздел 1: "Не хватает N баллов").
 */
export function createButton({
  label,
  icon: iconName = null,
  variant = 'green',
  size = 'm',
  onClick,
  disabled = false,
  reason = '',
  ariaLabel,
} = {}) {
  const wrapEl = el('div', 'msc-btn-wrap');
  const btn = el('button', `msc-btn msc-btn--${variant} msc-btn--${size}`, { type: 'button' });
  if (ariaLabel) btn.setAttribute('aria-label', ariaLabel);
  if (iconName) {
    const iconEl = el('span', 'msc-btn__icon', { html: icon(iconName) });
    btn.appendChild(iconEl);
  }
  if (label) btn.appendChild(el('span', 'msc-btn__label msc-outline-text', { text: label }));
  btn.appendChild(el('span', 'msc-btn__shine'));
  wrapEl.appendChild(btn);
  const reasonEl = reason ? el('span', 'msc-btn-reason', { text: reason }) : null;
  if (reasonEl) wrapEl.appendChild(reasonEl);

  function setDisabled(isDisabled, reasonText = '') {
    btn.disabled = isDisabled;
    btn.classList.toggle('msc-btn--disabled', isDisabled);
    let r = wrapEl.querySelector('.msc-btn-reason');
    if (isDisabled && reasonText) {
      if (!r) { r = el('span', 'msc-btn-reason'); wrapEl.appendChild(r); }
      r.textContent = reasonText;
    } else if (r) {
      r.remove();
    }
  }

  if (disabled) setDisabled(true, reason);
  if (onClick) btn.addEventListener('click', onClick);
  return { el: wrapEl, button: btn, setDisabled };
}

/** Круглая красная кнопка "✕", 44x44, слегка выступает за угол панели-родителя. */
export function createCloseButton({ onClick, ariaLabel = 'Закрыть' } = {}) {
  const btn = el('button', 'msc-close msc-btn', { type: 'button', 'aria-label': ariaLabel });
  btn.appendChild(el('span', 'msc-btn__label', { text: '✕' }));
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Модальное окно: затемнение + pop + фокус-ловушка + Esc.
 * dock: true — не закрывает мир целиком, окно "выезжает" внизу по центру
 * (раздел 3.4 — окна "Да/Нет" не должны прятать сцену).
 * Возвращает {backdrop, modal, open, close}. Начинает скрытым — open() монтирует в container.
 */
export function createModal({ bodyEl, container, dock = false, full = false, onRequestClose, onClose, labelledBy } = {}) {
  const backdrop = el('div', `msc-modal-backdrop ${dock ? 'msc-modal-backdrop--dock' : ''}`.trim());
  const modal = el('div', `msc-modal ${full ? 'msc-modal--full' : ''}`.trim(), {
    role: 'dialog',
    'aria-modal': 'true',
  });
  if (labelledBy) modal.setAttribute('aria-labelledby', labelledBy);
  modal.appendChild(bodyEl);
  backdrop.appendChild(modal);

  let lastFocused = null;

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onRequestClose ? onRequestClose() : close();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR)).filter((n) => !n.disabled && n.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function open() {
    lastFocused = document.activeElement;
    (container || document.body).appendChild(backdrop);
    document.addEventListener('keydown', onKeydown, true);
    const first = modal.querySelector(FOCUSABLE_SELECTOR);
    (first || modal).focus?.();
    if (!first) modal.setAttribute('tabindex', '-1');
  }

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    onClose?.();
    backdrop.classList.add('is-closing');
    modal.classList.add('is-closing');
    document.removeEventListener('keydown', onKeydown, true);
    setTimeout(() => {
      backdrop.remove();
      lastFocused?.focus?.();
    }, 250);
  }

  function shake() {
    modal.classList.remove('msc-modal--shake');
    // reflow, чтобы анимация перезапустилась при повторной ошибке подряд
    void modal.offsetWidth;
    modal.classList.add('msc-modal--shake');
  }

  return { backdrop, modal, open, close, shake };
}

/** Очередь всплывающих уведомлений — не перекрывают друг друга (раздел 4). */
export function createToastLayer(container) {
  const layer = el('div', 'msc-toast-layer');
  container.appendChild(layer);
  function show(text, { iconName = null, durationMs = 2600 } = {}) {
    const toast = el('div', 'msc-toast');
    if (iconName) toast.appendChild(el('span', 'msc-toast__icon', { html: icon(iconName) }));
    toast.appendChild(el('span', null, { text }));
    layer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('is-closing');
      setTimeout(() => toast.remove(), 220);
    }, durationMs);
  }
  return { el: layer, show };
}

/** Облачко с хвостиком (раздел 2/3.2/3.4). tailSide: 'left' | 'right'. */
export function createSpeechBubble({ bodyEl, tailSide = 'left' } = {}) {
  const { el: panel, body } = createPanel({ className: `msc-bubble msc-bubble--pos-${tailSide}` });
  body.appendChild(bodyEl);
  panel.appendChild(el('div', 'msc-bubble__tail'));
  return panel;
}

/** Ряд точек прогресса — пройденные золотые, текущая пульсирует (раздел 3.5). */
export function createProgressDots(total, currentIndex) {
  const root = el('div', 'msc-progress-dots', { role: 'list' });
  for (let i = 0; i < total; i++) {
    const dot = el('span', 'msc-progress-dot', { role: 'listitem' });
    if (i < currentIndex) dot.classList.add('is-done');
    else if (i === currentIndex) dot.classList.add('is-current');
    root.appendChild(dot);
  }
  return root;
}

/** Трубка с золотой заливкой и звездой на конце (раздел 2 — ProgressBar). */
export function createProgressBar(percent = 0) {
  const root = el('div', 'msc-progress-bar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100' });
  const fill = el('div', 'msc-progress-bar__fill');
  const star = el('div', 'msc-progress-bar__star', { html: icon('star') });
  root.appendChild(fill);
  root.appendChild(star);
  function setProgress(pct) {
    const clamped = Math.max(0, Math.min(100, pct));
    fill.style.width = `${clamped}%`;
    star.style.left = `${clamped}%`;
    root.setAttribute('aria-valuenow', String(Math.round(clamped)));
  }
  setProgress(percent);
  return { el: root, setProgress };
}

/** 1-3 звезды с анимацией появления по очереди (раздел 3.5 — итог викторины). */
export function createStarRow(count, { max = 3, animate = true } = {}) {
  const root = el('div', 'msc-star-row');
  const stars = [];
  for (let i = 0; i < max; i++) {
    const star = el('span', 'msc-star is-empty', { html: icon('star') });
    root.appendChild(star);
    stars.push(star);
  }
  stars.forEach((star, i) => {
    if (i >= count) return;
    const reveal = () => { star.classList.remove('is-empty'); star.classList.add('is-filled'); };
    if (animate) setTimeout(reveal, 180 + i * 220);
    else reveal();
  });
  return root;
}

/** Ряд сердечек-жизней для HUD мини-игры (раздел 3.6). */
export function createHeartsRow(lives, max = lives) {
  const root = el('div', 'msc-hearts-row');
  const hearts = [];
  for (let i = 0; i < max; i++) {
    const heart = el('span', i < lives ? 'msc-heart is-filled' : 'msc-heart is-empty', { html: icon('heart') });
    root.appendChild(heart);
    hearts.push(heart);
  }
  function setLives(n) {
    hearts.forEach((h, i) => h.className = i < n ? 'msc-heart is-filled' : 'msc-heart is-empty');
  }
  return { el: root, setLives };
}

/** Табличка с иконкой звезды-монеты и "+" справа — открывает магазин (раздел 2/3.3). */
export function createPointsBadge(points, { onClick } = {}) {
  const root = el('button', 'msc-points-badge', { type: 'button', 'aria-label': 'Баллы — открыть магазин' });
  const iconEl = el('span', 'msc-points-badge__icon', { html: icon('coin') });
  const value = el('span', null, { text: String(points) });
  const plus = el('span', 'msc-points-badge__plus', { text: '+' });
  root.appendChild(iconEl);
  root.appendChild(value);
  root.appendChild(plus);
  if (onClick) root.addEventListener('click', onClick);
  function setPoints(n) { value.textContent = String(n); }
  return { el: root, setPoints };
}

/** Монеты летят от fromEl к toEl (раздел 2 — CoinFly). Возвращает Promise, когда долетели все. */
export function flyCoinsTo(fromEl, toEl, count = 6) {
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();
  const promises = [];
  for (let i = 0; i < count; i++) {
    const coin = el('div', 'msc-coin', { html: icon('coin') });
    document.body.appendChild(coin);
    const startX = fromRect.left + fromRect.width / 2 + (Math.random() - 0.5) * 30;
    const startY = fromRect.top + fromRect.height / 2 + (Math.random() - 0.5) * 30;
    coin.style.left = `${startX}px`;
    coin.style.top = `${startY}px`;
    coin.style.opacity = '1';
    const p = new Promise((resolve) => {
      setTimeout(() => {
        coin.style.left = `${toRect.left + toRect.width / 2}px`;
        coin.style.top = `${toRect.top + toRect.height / 2}px`;
        coin.style.opacity = '0';
        setTimeout(() => { coin.remove(); resolve(); }, 560);
      }, i * 60);
    });
    promises.push(p);
  }
  return Promise.all(promises);
}

/** Всплывающий и гаснущий текст "+10" (раздел 2 — FloatingText). */
export function showFloatingText(text, anchorEl, { className = '' } = {}) {
  const host = anchorEl.getBoundingClientRect ? anchorEl : anchorEl.el;
  const rect = host.getBoundingClientRect();
  const parent = host.offsetParent || document.body;
  const parentRect = parent.getBoundingClientRect();
  const node = el('div', `msc-floating-text ${className}`.trim(), { text });
  node.style.top = `${rect.top - parentRect.top}px`;
  node.style.left = `${rect.left - parentRect.left + rect.width / 2}px`;
  parent.appendChild(node);
  setTimeout(() => node.remove(), 950);
  return node;
}

/** Вкладки (раздел 2 — Tabs, используются в магазине). */
export function createTabs(tabs, { activeId, onChange } = {}) {
  const root = el('div', 'msc-tabs', { role: 'tablist' });
  const buttons = new Map();
  tabs.forEach((tab) => {
    const btn = el('button', `msc-tab ${tab.id === activeId ? 'is-active' : ''}`.trim(), {
      type: 'button',
      role: 'tab',
      'aria-selected': String(tab.id === activeId),
      text: tab.label,
    });
    btn.addEventListener('click', () => {
      setActive(tab.id);
      onChange?.(tab.id);
    });
    buttons.set(tab.id, btn);
    root.appendChild(btn);
  });
  function setActive(id) {
    for (const [tabId, btn] of buttons) {
      const active = tabId === id;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    }
  }
  return { el: root, setActive };
}

/** Карточка (экскурсии/открытки). image может быть null — тогда рисуется заглушка градиентом. */
export function createCard({ imageContent, title, desc, footer, purchased = false } = {}) {
  const root = el('div', 'msc-card');
  if (purchased) root.appendChild(createPurchasedRibbon());
  const image = el('div', 'msc-card__image');
  if (imageContent) image.appendChild(imageContent);
  root.appendChild(image);
  const body = el('div', 'msc-card__body');
  if (title) body.appendChild(el('div', 'msc-card__title', { text: title }));
  if (desc) body.appendChild(el('div', 'msc-card__desc', { text: desc }));
  if (footer) body.appendChild(footer);
  root.appendChild(body);
  return root;
}

/** Диагональная лента "Куплено" поверх карточки. */
export function createPurchasedRibbon(text = 'Куплено') {
  return el('div', 'msc-ribbon-purchased', { text });
}

/** Круглая глянцевая кнопка с подписью снизу — HUD (Карта/Открытки/Магазин). */
export function createIconButton({ iconName, label, onClick, variant = 'blue' } = {}) {
  const root = el('button', 'msc-icon-btn', { type: 'button' });
  const circle = el('span', `msc-icon-btn__circle msc-btn--${variant}`.trim(), { html: icon(iconName) });
  root.appendChild(circle);
  if (label) root.appendChild(el('span', 'msc-icon-btn__label', { text: label }));
  if (onClick) root.addEventListener('click', onClick);
  return root;
}

/** Лёгкое конфетти кодом (раздел 1 — Confetti), уважает prefers-reduced-motion через CSS. */
export function spawnConfetti(container, { count = 24 } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const layer = el('div', 'msc-confetti-layer');
  container.appendChild(layer);
  const colors = ['#FF6B5B', '#FFB13C', '#7ED957', '#5CC0F0', '#FFC93C'];
  for (let i = 0; i < count; i++) {
    const piece = el('span', 'msc-confetti-piece');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 300}ms`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(piece);
  }
  setTimeout(() => layer.remove(), 1600);
}
