// Единая тема временного интерфейса (раздел 8 спецификации). Следующий этап
// расширит этот модуль — палитра и константы стиля собраны здесь, чтобы
// не разбредались по компонентам.

export const THEME = {
  panelFillTop: '#FFF3D6',
  panelFillBottom: '#FFE6B0',
  panelBorder: '#3B2414',
  panelInnerTrim: '#C98A3A',
  ribbonFill: '#3D6EA5',
  ribbonText: '#FFFFFF',
  buttonYes: '#4F9A5C',
  buttonYesDark: '#357140',
  buttonNo: '#E0743E',
  buttonNoDark: '#B8522A',
  textDark: '#3B2414',
  textOnButton: '#FFFFFF',

  hotspotColors: {
    quiz: { light: '#4AA8E8', dark: '#2A78C8' },
    minigame: { light: '#FFB13C', dark: '#F0701A' },
    info: { light: '#5CD1C0', dark: '#2AA391' },
    shop: { light: '#7ED957', dark: '#3FA535' },
    door: { light: '#FFD35A', dark: '#E8A21C' },
  },
  hotspotCompleted: { light: '#7ED957', dark: '#3FA535' },

  fontFamily: '"Nunito", sans-serif',
  overlayFadeAlpha: 0.6, // прозрачность перекрытия (крона и т.п.), когда герой под ним
};

export function loadThemeFont() {
  if (document.getElementById('theme-font-face')) return;
  const style = document.createElement('style');
  style.id = 'theme-font-face';
  style.textContent = `
    @font-face {
      font-family: 'Nunito';
      src: url('assets/fonts/Nunito.ttf') format('truetype');
      font-weight: 200 900;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
}

// ===========================================================================
// ЭТАП 2 — дизайн-система HTML/CSS-слоя окон и экранов (раздел 1 ТЗ).
// Мир, знаки над горячими точками и мини-игры остаются на canvas (THEME выше
// и hotspotMarker.js их не трогают) — все ОКНА И ЭКРАНЫ теперь рисуются
// обычным DOM поверх канваса: это разом снимает блюр текста на дробном DPR
// (см. память проекта — с этим уже намучились на canvas) и даёт нормальную
// работу с клавиатурой/фокусом, чего от canvas-кнопок добиться неудобно.
// ===========================================================================

/** Токены темы как CSS custom properties — меняем облик через них, а не точечно. */
const DESIGN_TOKENS_CSS = `
  :root {
    --msc-panel-top: #FFF3D6;
    --msc-panel-bottom: #FFE6B0;
    --msc-ink: #3B2414;
    --msc-text: #4A2C14;
    --msc-gold: #C98A3D;
    --msc-gold-light: #FFF9E8;

    --msc-ribbon: #2F6FB5;
    --msc-ribbon-light: #4A8FD8;
    --msc-ribbon-edge: #1C4E82;

    --msc-green: #7ED957; --msc-green-dark: #3FA535; --msc-green-edge: #2C7A25;
    --msc-orange: #FFB13C; --msc-orange-dark: #F0701A; --msc-orange-edge: #B04E0C;
    --msc-blue: #5CC0F0; --msc-blue-dark: #2A8AD0; --msc-blue-edge: #1C5E96;
    --msc-red: #FF6B5B; --msc-red-dark: #D93A2B; --msc-red-edge: #9C2418;
    --msc-gray: #C9C3B8; --msc-gray-dark: #ADA79B; --msc-gray-edge: #9A9488; --msc-gray-text: #8A8378;

    --msc-success: #3FA535;
    --msc-error: #D93A2B;
    --msc-gold-award: #FFC93C;

    --msc-radius-panel: 24px;
    --msc-radius-btn: 14px;
    --msc-border: 4px;

    --msc-shadow-panel: 0 12px 26px rgba(46, 27, 14, 0.4);
    --msc-shadow-float: 0 6px 14px rgba(46, 27, 14, 0.3);

    --msc-font: 'Nunito', 'Segoe UI', Arial, sans-serif;

    --msc-fs-body: 16px;
    --msc-fs-body-m: 18px;
    --msc-fs-title: 22px;
    --msc-fs-title-l: 28px;

    --msc-pop-ms: 250ms;
    --msc-fade-ms: 250ms;
  }

  /* @container phone, не @media: узкой бывает и рамка игры в широком окне
     десктопа (низкое окно -> ширина рамки считается от высоты). Переменные —
     на #ui-layer: у :root нет контейнера-предка. */
  @container phone (max-width: 480px) {
    #ui-layer {
      --msc-fs-body: 14px;
      --msc-fs-body-m: 16px;
      --msc-fs-title: 19px;
      --msc-fs-title-l: 23px;
    }
  }

  /* ============================== ОБЩЕЕ ============================== */
  .msc-root, .msc-root * { box-sizing: border-box; }
  .msc-root {
    font-family: var(--msc-font);
    -webkit-tap-highlight-color: transparent;
  }
  .msc-hidden { display: none !important; }
  .msc-visually-hidden {
    position: absolute; width: 1px; height: 1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap;
  }

  .msc-outline-text {
    color: #fff;
    -webkit-text-stroke: 3px var(--msc-ink);
    paint-order: stroke fill;
    text-shadow: 0 2px 0 rgba(0,0,0,.22);
    font-weight: 800;
  }

  @keyframes msc-pop-in {
    0% { transform: scale(0.8); opacity: 0; }
    70% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); }
  }
  @keyframes msc-pop-out {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0.8); opacity: 0; }
  }
  @keyframes msc-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes msc-fade-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes msc-shake {
    10%, 90% { transform: translateX(-2px); }
    20%, 80% { transform: translateX(4px); }
    30%, 50%, 70% { transform: translateX(-8px); }
    40%, 60% { transform: translateX(8px); }
  }
  @keyframes msc-shine-sweep {
    0%, 60% { transform: translateX(-140%) skewX(-18deg); }
    100% { transform: translateX(220%) skewX(-18deg); }
  }
  @keyframes msc-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  @keyframes msc-float-up {
    0% { transform: translate(-50%, 0); opacity: 1; }
    100% { transform: translate(-50%, -46px); opacity: 0; }
  }
  @keyframes msc-confetti-fall {
    0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(220px) rotate(340deg); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .msc-root * {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }

  /* ============================== ПАНЕЛЬ ============================== */
  .msc-panel {
    position: relative;
    background: var(--msc-ink);
    border-radius: calc(var(--msc-radius-panel) + var(--msc-border));
    padding: var(--msc-border);
    box-shadow: var(--msc-shadow-panel);
  }
  .msc-panel__inner {
    position: relative;
    height: 100%;
    border: var(--msc-border) solid var(--msc-gold);
    border-radius: var(--msc-radius-panel);
    background: linear-gradient(180deg, var(--msc-panel-top) 0%, var(--msc-panel-bottom) 100%);
    box-shadow: inset 0 2px 0 rgba(255,255,255,.5), inset 0 -10px 18px -12px rgba(59,36,20,.35);
    overflow: hidden;
  }
  .msc-panel__inner::before {
    content: '';
    position: absolute; inset: 0 0 55% 0;
    background: linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,0));
    pointer-events: none;
  }
  .msc-panel__body { position: relative; padding: 20px; }

  /* ============================== ЛЕНТА ============================== */
  .msc-ribbon {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 6px 28px;
    background: linear-gradient(180deg, var(--msc-ribbon-light) 0%, var(--msc-ribbon) 100%);
    box-shadow: 0 3px 0 rgba(0,0,0,.2), 0 4px 8px rgba(0,0,0,.25);
  }
  .msc-ribbon::before, .msc-ribbon::after {
    content: '';
    position: absolute;
    top: 100%;
    width: 0; height: 0;
    border-style: solid;
  }
  .msc-ribbon::before {
    left: 0;
    border-width: 6px 0 0 14px;
    border-color: transparent transparent transparent var(--msc-ribbon-edge, #1C4E82);
  }
  .msc-ribbon::after {
    right: 0;
    border-width: 6px 14px 0 0;
    border-color: transparent transparent transparent transparent;
    border-right-color: var(--msc-ribbon-edge, #1C4E82);
  }
  .msc-ribbon__text {
    font-size: var(--msc-fs-title);
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .msc-ribbon--wrap { white-space: normal; text-align: center; }
  .msc-ribbon--wrap .msc-ribbon__text { white-space: normal; }

  /* ===================== КНОПКИ ===================== */
  .msc-btn {
    --btn-light: var(--msc-green);
    --btn-dark: var(--msc-green-dark);
    --btn-edge: var(--msc-green-edge);
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 44px;
    min-height: 44px;
    padding: 0 22px;
    border: none;
    border-radius: var(--msc-radius-btn);
    background: linear-gradient(180deg, color-mix(in srgb, var(--btn-light) 70%, white) 0%, var(--btn-light) 60%);
    box-shadow:
      inset 0 2px 0 rgba(255,255,255,.6),
      inset 0 -7px 0 var(--btn-dark),
      0 4px 0 var(--btn-edge),
      0 7px 10px rgba(37, 22, 12, .28);
    font-family: var(--msc-font);
    font-weight: 800;
    font-size: var(--msc-fs-body-m);
    cursor: pointer;
    user-select: none;
    transform: translateY(0);
    transition: transform .09s ease, box-shadow .09s ease, filter .15s ease;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }
  .msc-btn__label {
    position: relative;
    z-index: 1;
    color: #fff;
    -webkit-text-stroke: 2.2px var(--msc-ink);
    paint-order: stroke fill;
    text-shadow: 0 2px 0 rgba(0,0,0,.2);
    white-space: normal;
    /* переносить только между словами — рвать слово («Вернутьс/я») нельзя;
       если слово не помещается, кнопка уменьшает шрифт (см. .msc-dialog-actions) */
    overflow-wrap: normal;
    word-break: normal;
  }
  .msc-btn__icon { position: relative; z-index: 1; width: 22px; height: 22px; flex: none; }
  .msc-btn::after {
    content: '';
    position: absolute; inset: 0 0 55% 0;
    background: linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,0));
    pointer-events: none;
  }
  .msc-btn__shine {
    position: absolute; top: -20%; bottom: -20%; left: 0; width: 34%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
    animation: msc-shine-sweep 3.6s ease-in-out infinite;
    animation-delay: 1.2s;
    pointer-events: none;
  }
  .msc-btn:hover { filter: brightness(1.04); }
  .msc-btn:active, .msc-btn.is-pressed {
    transform: translateY(4px);
    box-shadow:
      inset 0 2px 0 rgba(255,255,255,.4),
      inset 0 -2px 0 var(--btn-dark),
      0 1px 0 var(--btn-edge);
  }
  .msc-btn:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
    box-shadow:
      inset 0 2px 0 rgba(255,255,255,.6),
      inset 0 -7px 0 var(--btn-dark),
      0 4px 0 var(--btn-edge),
      0 0 0 5px rgba(47, 111, 181, .55);
  }

  .msc-btn--green  { --btn-light: var(--msc-green);  --btn-dark: var(--msc-green-dark);  --btn-edge: var(--msc-green-edge); }
  .msc-btn--orange { --btn-light: var(--msc-orange); --btn-dark: var(--msc-orange-dark); --btn-edge: var(--msc-orange-edge); }
  .msc-btn--blue   { --btn-light: var(--msc-blue);   --btn-dark: var(--msc-blue-dark);   --btn-edge: var(--msc-blue-edge); }
  .msc-btn--red    { --btn-light: var(--msc-red);    --btn-dark: var(--msc-red-dark);    --btn-edge: var(--msc-red-edge); }
  .msc-btn--disabled, .msc-btn:disabled {
    --btn-light: var(--msc-gray); --btn-dark: var(--msc-gray-dark); --btn-edge: var(--msc-gray-edge);
    cursor: not-allowed;
    pointer-events: none;
  }
  .msc-btn--disabled .msc-btn__label, .msc-btn:disabled .msc-btn__label {
    color: #fff;
    -webkit-text-stroke: 2.2px var(--msc-gray-edge);
  }
  .msc-btn--disabled .msc-btn__shine, .msc-btn:disabled .msc-btn__shine { display: none; }

  .msc-btn--l { min-height: 56px; padding: 0 30px; font-size: var(--msc-fs-title); border-radius: 18px; }
  .msc-btn--m { min-height: 48px; padding: 0 24px; }
  .msc-btn--s { min-height: 44px; padding: 0 16px; font-size: var(--msc-fs-body); border-radius: 12px; }

  .msc-btn-reason {
    display: block;
    margin-top: 6px;
    font-size: 13px;
    font-weight: 700;
    color: var(--msc-gray-text);
    text-align: center;
  }

  /* ===================== КРУГЛАЯ КНОПКА ЗАКРЫТИЯ ===================== */
  .msc-close {
    --btn-light: var(--msc-red); --btn-dark: var(--msc-red-dark); --btn-edge: var(--msc-red-edge);
    position: absolute;
    top: -18px; right: -18px;
    width: 44px; height: 44px;
    min-width: 44px; min-height: 44px;
    padding: 0;
    border-radius: 50%;
    z-index: 5;
    font-size: 20px;
  }
  @container phone (max-width: 480px) {
    .msc-close { top: -14px; right: -14px; }
  }

  /* ============================== МОДАЛКИ ============================== */
  /* pointer-events: auto ЯВНО — #ui-layer (родитель поверх canvas) держит
     none по умолчанию, чтобы клики без открытых окон доходили до мира. */
  .msc-modal-backdrop {
    position: absolute; inset: 0;
    background: rgba(20, 14, 10, 0.5);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: msc-fade-in var(--msc-fade-ms) ease-out;
    z-index: 50;
    pointer-events: auto;
  }
  .msc-modal-backdrop.is-closing { animation: msc-fade-out var(--msc-fade-ms) ease-in forwards; }
  .msc-modal-backdrop--dock {
    align-items: flex-end;
    background: transparent;
    padding: 0 16px 18px;
    pointer-events: none;
  }
  .msc-modal-backdrop--dock .msc-modal { pointer-events: auto; }
  .msc-modal {
    position: relative;
    max-width: 520px;
    width: 100%;
    animation: msc-pop-in var(--msc-pop-ms) cubic-bezier(.2,1.6,.4,1);
  }
  .msc-modal.is-closing { animation: msc-pop-out var(--msc-pop-ms) ease-in forwards; }
  .msc-modal--full { max-width: min(720px, 100%); height: min(100%, 900px); }
  .msc-modal--full .msc-panel { height: 100%; }
  .msc-modal--shake .msc-panel { animation: msc-shake .4s; }

  /* ============================== ТОСТЫ ============================== */
  .msc-toast-layer {
    position: absolute;
    top: 14px; left: 0; right: 0;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    pointer-events: none;
    z-index: 80;
  }
  .msc-toast {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 18px;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--msc-panel-top), var(--msc-panel-bottom));
    border: 3px solid var(--msc-ink);
    box-shadow: var(--msc-shadow-float);
    font-weight: 800;
    font-size: var(--msc-fs-body);
    color: var(--msc-text);
    animation: msc-pop-in 220ms ease-out;
  }
  .msc-toast.is-closing { animation: msc-fade-out 220ms ease-in forwards; }
  .msc-toast__icon { width: 20px; height: 20px; flex: none; }

  /* ============================== ОБЛАЧКО ============================== */
  .msc-bubble {
    position: relative;
    max-width: 360px;
  }
  .msc-bubble__tail {
    position: absolute;
    left: 44px; bottom: -14px;
    width: 28px; height: 20px;
    overflow: hidden;
  }
  .msc-bubble__tail::before {
    content: '';
    position: absolute; left: 0; top: -14px;
    width: 24px; height: 24px;
    background: var(--msc-ink);
    transform: rotate(45deg);
    border-radius: 6px;
  }
  .msc-bubble--pos-right .msc-bubble__tail { left: auto; right: 44px; }

  /* ============================== ПРОГРЕСС ============================== */
  .msc-progress-dots { display: flex; align-items: center; gap: 8px; }
  .msc-progress-dot {
    width: 14px; height: 14px; border-radius: 50%;
    background: var(--msc-panel-top);
    border: 2.5px solid var(--msc-ink);
  }
  .msc-progress-dot.is-done { background: var(--msc-gold-award); }
  .msc-progress-dot.is-current {
    background: var(--msc-blue);
    animation: msc-pop-in 300ms ease, msc-bob 1s ease-in-out infinite;
  }

  .msc-progress-bar {
    position: relative;
    height: 22px;
    border-radius: 999px;
    background: linear-gradient(180deg, #E8DEC6, #D9CBA6);
    border: 3px solid var(--msc-ink);
    box-shadow: inset 0 2px 4px rgba(0,0,0,.25);
    overflow: visible;
  }
  .msc-progress-bar__fill {
    position: absolute; inset: 2px;
    right: auto;
    border-radius: 999px;
    background: linear-gradient(180deg, #FFE484, var(--msc-gold-award));
    box-shadow: inset 0 2px 0 rgba(255,255,255,.6);
    transition: width .4s ease;
  }
  .msc-progress-bar__star {
    position: absolute;
    top: 50%; width: 26px; height: 26px;
    transform: translate(-50%, -50%);
    transition: left .4s ease;
    filter: drop-shadow(0 2px 2px rgba(0,0,0,.35));
  }

  .msc-star-row { display: inline-flex; gap: 6px; }
  .msc-star-row .msc-star { width: 44px; height: 44px; opacity: 0; transform: scale(0.3); }
  .msc-star-row .msc-star.is-filled {
    opacity: 1; transform: scale(1);
    transition: transform 380ms cubic-bezier(.3,1.8,.4,1), opacity 200ms;
  }
  .msc-star-row .msc-star.is-empty { opacity: .35; transform: scale(1); }

  .msc-hearts-row { display: inline-flex; gap: 4px; }
  .msc-hearts-row .msc-heart { width: 24px; height: 24px; transition: transform 200ms, opacity 200ms; }
  .msc-hearts-row .msc-heart.is-empty { opacity: .3; transform: scale(.85); }

  .msc-points-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 16px 8px 10px;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--msc-panel-top), var(--msc-panel-bottom));
    border: 3px solid var(--msc-ink);
    box-shadow: var(--msc-shadow-float);
    font-weight: 800;
    font-size: var(--msc-fs-title);
    color: var(--msc-text);
    cursor: pointer;
    min-height: 44px;
  }
  .msc-points-badge__icon { width: 28px; height: 28px; flex: none; }
  .msc-points-badge__plus {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--msc-green); color: #fff; font-size: 16px; font-weight: 900;
    box-shadow: 0 2px 0 var(--msc-green-edge);
  }

  .msc-coin {
    position: fixed;
    width: 22px; height: 22px;
    z-index: 200;
    pointer-events: none;
    filter: drop-shadow(0 2px 2px rgba(0,0,0,.35));
    transition: left .55s cubic-bezier(.3,.6,.3,1), top .55s cubic-bezier(.3,.6,.3,1), opacity .15s ease .4s;
  }

  .msc-floating-text {
    position: absolute;
    left: 50%;
    font-weight: 900;
    font-size: 20px;
    color: var(--msc-gold-award);
    -webkit-text-stroke: 2px var(--msc-ink);
    paint-order: stroke fill;
    pointer-events: none;
    animation: msc-float-up 900ms ease-out forwards;
    white-space: nowrap;
  }

  /* ============================== ВКЛАДКИ ============================== */
  .msc-tabs { display: flex; gap: 8px; }
  .msc-tab {
    flex: 1;
    min-height: 44px;
    padding: 0 14px;
    border: 3px solid var(--msc-ink);
    border-radius: 12px;
    background: var(--msc-panel-bottom);
    font-weight: 800;
    font-size: var(--msc-fs-body-m);
    color: var(--msc-text);
    cursor: pointer;
  }
  .msc-tab.is-active {
    background: linear-gradient(180deg, var(--msc-ribbon-light), var(--msc-ribbon));
    color: #fff;
    -webkit-text-stroke: 0;
  }
  .msc-tab:focus-visible { outline: 3px solid var(--msc-ribbon); outline-offset: 2px; }

  /* ============================== КАРТОЧКА ============================== */
  .msc-card {
    position: relative;
    border: var(--msc-border) solid var(--msc-ink);
    border-radius: 18px;
    background: var(--msc-panel-top);
    box-shadow: var(--msc-shadow-float);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .msc-card__image {
    position: relative;
    height: 140px;
    background: linear-gradient(135deg, var(--msc-blue), var(--msc-ribbon));
    display: flex; align-items: center; justify-content: center;
    border-bottom: 3px solid var(--msc-ink);
  }
  .msc-card__image svg { width: 64px; height: 64px; opacity: .9; }
  .msc-card__body { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .msc-card__title { font-size: var(--msc-fs-title); font-weight: 800; color: var(--msc-text); }
  .msc-card__desc { font-size: var(--msc-fs-body); color: var(--msc-text); opacity: .85; line-height: 1.35; }
  .msc-card__price {
    display: inline-flex; align-items: center; gap: 6px;
    align-self: flex-start;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--msc-panel-bottom);
    border: 2px solid var(--msc-ink);
    font-weight: 800;
    color: var(--msc-text);
  }
  .msc-card__price svg { width: 18px; height: 18px; }

  .msc-ribbon-purchased {
    position: absolute; top: 16px; right: -38px;
    width: 150px;
    padding: 4px 0;
    background: linear-gradient(180deg, var(--msc-green), var(--msc-green-dark));
    color: #fff; text-align: center; font-weight: 800; font-size: 13px;
    transform: rotate(45deg);
    box-shadow: 0 2px 4px rgba(0,0,0,.3);
    border-top: 2px solid rgba(255,255,255,.5);
    border-bottom: 2px solid var(--msc-green-edge);
    z-index: 2;
  }

  /* ============================== ICON BUTTON (HUD) ============================== */
  .msc-icon-btn {
    display: inline-flex; flex-direction: column; align-items: center; gap: 4px;
    background: none; border: none; cursor: pointer; min-width: 44px;
    -webkit-tap-highlight-color: transparent;
  }
  .msc-icon-btn__circle {
    --btn-light: var(--msc-blue); --btn-dark: var(--msc-blue-dark); --btn-edge: var(--msc-blue-edge);
    width: 56px; height: 56px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(180deg, color-mix(in srgb, var(--btn-light) 70%, white), var(--btn-light) 60%);
    box-shadow: inset 0 2px 0 rgba(255,255,255,.6), inset 0 -7px 0 var(--btn-dark), 0 4px 0 var(--btn-edge), 0 6px 10px rgba(0,0,0,.25);
    position: relative;
    transition: transform .09s ease;
  }
  .msc-icon-btn:active .msc-icon-btn__circle { transform: translateY(4px); box-shadow: inset 0 2px 0 rgba(255,255,255,.4), inset 0 -2px 0 var(--btn-dark), 0 1px 0 var(--btn-edge); }
  .msc-icon-btn__circle svg { width: 30px; height: 30px; position: relative; z-index: 1; }
  .msc-icon-btn__label {
    font-size: 13px; font-weight: 800;
    color: #fff; -webkit-text-stroke: 2px var(--msc-ink); paint-order: stroke fill;
  }
  .msc-icon-btn:focus-visible .msc-icon-btn__circle { outline: 3px solid #fff; outline-offset: 3px; }

  /* ============================== КОНФЕТТИ ============================== */
  .msc-confetti-layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 60; }
  .msc-confetti-piece {
    position: absolute; top: 0;
    width: 8px; height: 14px;
    animation: msc-confetti-fall 1100ms ease-in forwards;
  }

  /* ============================== ТЕКСТ ДИАЛОГОВ ============================== */
  .msc-dialog-text {
    margin: 4px 0 18px;
    color: var(--msc-text);
    font-weight: 700;
    font-size: var(--msc-fs-body-m);
    line-height: 1.4;
    text-align: center;
    overflow-wrap: break-word;
  }
  .msc-dialog-actions {
    display: flex;
    gap: 14px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .msc-dialog-actions .msc-btn-wrap { flex: 1 1 120px; max-width: 220px; }
  .msc-dialog-actions .msc-btn { width: 100%; }
  /* Крупные кнопки в ряду действий (результат викторины/мини-игры): в узкой
     рамке «Вернуться» не влезало в 23px с отступами по 30px. Шрифт — от
     ширины рамки игры (cqi = % ширины контейнера phone), не меньше 16px. */
  .msc-dialog-actions .msc-btn--l {
    padding: 0 12px;
    font-size: clamp(16px, 4.6cqi, var(--msc-fs-title));
  }

  /* Универсальный класс pop-анимации для элементов вне Modal (например, облачко факта). */
  .msc-pop { animation: msc-pop-in var(--msc-pop-ms) cubic-bezier(.2,1.6,.4,1); }
  .msc-pop.is-closing { animation: msc-pop-out var(--msc-pop-ms) ease-in forwards; }

  /* Облачко факта у информационных точек (раздел 3.4) — не модалка: не гасит
     мир затемнением, сцена под ним видна, закрывается тапом по себе или сама
     через 4с. */
  .msc-info-bubble {
    position: absolute;
    top: 8%;
    /* центр без transform: анимация .msc-pop сама пишет transform (scale) и
       затирала translateX(-50%) — облачко выезжало сбоку и дёргалось */
    left: 0; right: 0; margin-inline: auto;
    width: fit-content;
    max-width: min(360px, 82%);
    pointer-events: auto;
    cursor: pointer;
    z-index: 55;
  }

  /* ============================== HUD ============================== */
  .msc-hud-top {
    position: absolute;
    top: 0; left: 0; right: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 12px 12px 0;
    pointer-events: none;
  }
  .msc-hud-top > * { pointer-events: auto; }

  .msc-hud-portrait-wrap { display: flex; align-items: center; gap: 10px; }
  .msc-hud-portrait {
    width: 52px; height: 52px;
    border-radius: 50%;
    border: 3px solid var(--msc-ink);
    background: linear-gradient(180deg, var(--msc-panel-top), var(--msc-panel-bottom));
    box-shadow: var(--msc-shadow-float);
    overflow: hidden;
    flex: none;
    position: relative;
  }
  /* размеры/позиция картинки-портрета считаются в JS (heroPortrait.js) и
     проставляются инлайн — тут только сам контейнер (см. выше). */
  .msc-hud-progress-wrap { display: flex; flex-direction: column; gap: 3px; width: 110px; }
  .msc-hud-progress-label {
    font-size: 11px; font-weight: 800; color: #fff;
    -webkit-text-stroke: 1.6px var(--msc-ink); paint-order: stroke fill;
  }
  .msc-hud-progress-wrap .msc-progress-bar { height: 14px; }
  .msc-hud-progress-wrap .msc-progress-bar__star { width: 18px; height: 18px; }

  .msc-hud-top-right { display: flex; align-items: center; gap: 8px; flex: none; }
  /* На узких экранах портрет+прогресс+баллы+звук+меню в сумме не помещались
     в ширину — правая группа кнопок вылезала за край рамки (раздел 3.3:
     HUD не должен обрезаться). Сужаем прогресс-бар и зазоры, не трогая
     размер самих кнопок (должны остаться ≥44×44 CSS px). */
  @container phone (max-width: 480px) {
    .msc-hud-progress-wrap { width: 72px; }
    .msc-hud-portrait-wrap { gap: 6px; }
    .msc-hud-top-right { gap: 5px; }
    .msc-points-badge { padding: 6px 10px 6px 7px; gap: 5px; font-size: 15px; }
    .msc-points-badge__icon { width: 22px; height: 22px; }
  }
  .msc-hud-round-btn {
    --btn-light: var(--msc-panel-top); --btn-dark: var(--msc-panel-bottom); --btn-edge: var(--msc-gold);
    width: 44px; height: 44px; min-width: 44px; min-height: 44px;
    border-radius: 50%; padding: 0;
    background: linear-gradient(180deg, var(--msc-panel-top), var(--msc-panel-bottom));
    box-shadow: inset 0 2px 0 rgba(255,255,255,.7), inset 0 -5px 0 rgba(201,138,61,.4), 0 3px 0 var(--msc-gold), 0 5px 8px rgba(0,0,0,.25);
  }
  .msc-hud-round-btn svg { width: 24px; height: 24px; }
  .msc-hud-round-btn::after { display: none; }

  .msc-hud-bottom {
    position: absolute;
    left: 10px; right: 10px; bottom: 10px;
    /* без max-height: при узкой рамке текст цели переносится на 3-4 строки,
       и с потолком высоты вылезал из панели поверх кнопок */
    min-height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 14px;
    border-radius: 20px;
    background: linear-gradient(180deg, #8A5A34, #5E3A1F);
    border: 3px solid var(--msc-ink);
    box-shadow: var(--msc-shadow-panel);
    pointer-events: auto;
    transition: opacity .2s ease;
  }
  .msc-hud-bottom.is-dimmed { opacity: .25; pointer-events: none; }
  .msc-hud-top.is-dimmed { opacity: .25; pointer-events: none; }

  .msc-hud-goal { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1 1 auto; }
  .msc-hud-goal__icon { width: 34px; height: 34px; flex: none; }
  .msc-hud-goal__text {
    color: #fff; font-weight: 800; font-size: var(--msc-fs-body);
    text-shadow: 0 1px 0 rgba(0,0,0,.4);
    overflow-wrap: break-word;
    line-height: 1.25;
  }
  .msc-hud-goal.goal-flash .msc-hud-goal__text { animation: msc-goal-flash 900ms ease; }
  @keyframes msc-goal-flash {
    0%, 100% { color: #fff; }
    30% { color: var(--msc-gold-award); }
  }
  .msc-hud-actions { display: flex; gap: 6px; flex: none; }
  .msc-hud-actions .msc-icon-btn__circle { width: 46px; height: 46px; }
  .msc-hud-actions .msc-icon-btn__circle svg { width: 24px; height: 24px; }
  .msc-hud-actions .msc-icon-btn__label { font-size: 11px; }
  /* Совсем узкая рамка (низкое окно десктопа, маленький телефон): текст цели
     мельче, кнопки плотнее — чтобы цель не растягивала панель на пол-экрана. */
  @container phone (max-width: 400px) {
    .msc-hud-bottom { padding: 6px 10px; gap: 8px; }
    .msc-hud-goal { gap: 8px; }
    .msc-hud-goal__icon { width: 28px; height: 28px; }
    .msc-hud-goal__text { font-size: 12.5px; line-height: 1.2; }
    .msc-hud-actions { gap: 3px; }
    .msc-hud-actions .msc-icon-btn__circle { width: 44px; height: 44px; }
    .msc-hud-actions .msc-icon-btn__label { font-size: 10px; }
  }

  /* ============================== ТИТУЛЬНЫЙ ЭКРАН ============================== */
  .msc-title-screen {
    position: absolute; inset: 0;
    pointer-events: auto;
    overflow: hidden;
    /* готовая иллюстрация; цвет — на время загрузки картинки */
    background: #9ED3EE url("assets/title/title_bg.jpg") center / cover no-repeat;
  }
  .msc-title-content {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center;
    padding: 6% 6% 4%;
  }
  /* Логотип заставки. Размеры — от ширины рамки игры (cqi), чтобы в узкой
     рамке на десктопе и на телефоне пропорции были одинаковые. */
  .msc-logo {
    --logo-navy: #123A66;
    margin-top: 30px; /* ниже круглой кнопки звука (top 14px + 44px) */
    display: flex; flex-direction: column; align-items: center;
    text-align: center;
    filter: drop-shadow(0 8px 18px rgba(8, 36, 72, .28));
  }
  .msc-logo__brand {
    display: flex; align-items: center; gap: .6em;
    font-weight: 900;
    font-size: clamp(14px, 4.4cqi, 22px);
    color: #FFD76A;
    -webkit-text-stroke: .22em var(--logo-navy);
    paint-order: stroke fill;
  }
  .msc-logo__brand-text { letter-spacing: .5em; margin-right: -.5em; }
  .msc-logo__line {
    width: clamp(28px, 11cqi, 64px); height: 3px; border-radius: 2px;
    background: linear-gradient(90deg, rgba(255,215,106,0), #FFD76A);
    box-shadow: 0 1px 0 var(--logo-navy);
  }
  .msc-logo__line:last-child { background: linear-gradient(90deg, #FFD76A, rgba(255,215,106,0)); }
  .msc-logo__word {
    position: relative;
    isolation: isolate;
    margin-top: .05em;
    font-weight: 900;
    font-size: clamp(46px, 16.5cqi, 84px);
    line-height: 1;
    letter-spacing: .03em;
  }
  /* нижний слой: толстая обводка + «экструзия» вниз */
  .msc-logo__word::before {
    content: attr(data-text);
    position: absolute; inset: 0;
    z-index: -1;
    color: var(--logo-navy);
    -webkit-text-stroke: .16em var(--logo-navy);
    text-shadow: 0 .07em 0 #0B2747, 0 .12em .14em rgba(0,0,0,.28);
  }
  /* верхний слой: заливка белый -> тёплое золото */
  .msc-logo__fill {
    position: relative;
    background: linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 42%, #FFE6A3 60%, #F5B342 100%);
    -webkit-background-clip: text; background-clip: text;
    color: transparent;
  }
  .msc-logo__subtitle {
    margin-top: .9em;
    padding: .45em 1.3em .45em 1.6em;
    border-radius: 999px;
    background: rgba(18, 58, 102, .55);
    border: 1px solid rgba(255, 215, 106, .55);
    color: #fff;
    font-weight: 800;
    font-size: clamp(11px, 3.2cqi, 15px);
    letter-spacing: .28em;
    text-transform: uppercase;
    backdrop-filter: blur(2px);
  }
  .msc-title-buttons {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
    max-width: 320px;
  }
  .msc-title-buttons .msc-btn-wrap { width: 100%; }
  .msc-title-buttons .msc-btn { width: 100%; }
  .msc-title-secondary-row { display: flex; gap: 10px; width: 100%; }
  .msc-title-secondary-row .msc-btn-wrap { flex: 1; }
  .msc-title-sound {
    position: absolute; top: 14px; right: 14px;
  }

  /* ============================== ОБУЧЕНИЕ ============================== */
  .msc-onboarding {
    position: absolute; inset: 0;
    background: rgba(20,14,10,.55);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    pointer-events: auto;
    animation: msc-fade-in var(--msc-fade-ms) ease-out;
    z-index: 90;
  }
  .msc-onboarding__layout {
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    max-width: 420px;
    width: 100%;
  }
  .msc-onboarding__portrait {
    width: 96px; height: 96px;
    border-radius: 50%;
    border: 4px solid var(--msc-ink);
    background: linear-gradient(180deg, var(--msc-panel-top), var(--msc-panel-bottom));
    box-shadow: var(--msc-shadow-panel);
    overflow: hidden;
    position: relative;
    flex: none;
  }
  .msc-onboarding__footer {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; gap: 12px;
  }

  /* ============================== МЕНЮ ============================== */
  .msc-menu-list { display: flex; flex-direction: column; gap: 12px; min-width: 220px; }
  .msc-menu-list .msc-btn-wrap { width: 100%; }
  .msc-menu-list .msc-btn { width: 100%; }
  .msc-menu-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

  /* ============================== ВИКТОРИНА ============================== */
  .msc-quiz-panel { width: min(640px, 100%); height: 100%; }
  .msc-quiz-panel .msc-panel__body {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow: hidden;
  }
  .msc-quiz-header { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: none; }
  .msc-quiz-header .msc-ribbon { max-width: 100%; }
  .msc-quiz-counter { font-weight: 800; color: var(--msc-text); opacity: .75; font-size: var(--msc-fs-body); }
  .msc-quiz-dots { display: flex; justify-content: center; flex: none; }
  /* flex:1 + min-height:0 — без min-height:0 flex-элемент не сжимается меньше
     содержимого (классика), и вместо прокрутки только "вопрос+ответы" скроллилась
     бы вся панель целиком вместе с лентой и счётчиком — на невысоких окнах
     заголовок съезжал вместе с ответами, и последний вариант было легко не
     заметить. Теперь лента и счётчик всегда закреплены, скроллится только stage. */
  .msc-quiz-stage {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    padding-right: 4px;
  }

  /* .msc-modal--full .msc-panel {height:100%} (нужно растянуть ГЛАВНУЮ панель
     викторины на весь экран) каскадом задевает и вложенную карточку вопроса —
     тот же .msc-panel внутри. Специфичность та же (2 класса), но это правило
     ниже по файлу и выигрывает. Без этого карточка раздувается пустым местом
     на всю высоту flex-колонки .msc-quiz-stage. */
  .msc-quiz-stage .msc-quiz-question,
  .msc-quiz-stage .msc-quiz-question .msc-panel__inner { height: auto; flex: none; }
  .msc-quiz-question__text {
    margin: 0; color: var(--msc-text); font-weight: 800;
    font-size: var(--msc-fs-title); line-height: 1.4; text-align: center;
  }

  .msc-quiz-answers { display: flex; flex-direction: column; gap: 12px; }
  .msc-quiz-answer {
    width: 100%;
    justify-content: flex-start;
    gap: 14px;
    padding: 10px 18px;
    min-height: 56px;
  }
  .msc-quiz-answer__badge {
    flex: none;
    width: 32px; height: 32px;
    border-radius: 50%;
    background: var(--msc-panel-top);
    color: var(--msc-ink);
    display: flex; align-items: center; justify-content: center;
    font-weight: 900; font-size: 16px;
    box-shadow: 0 2px 0 rgba(0,0,0,.2);
  }
  .msc-quiz-answer__text { flex: 1; text-align: left; }
  .msc-quiz-answer__mark { width: 26px; height: 26px; flex: none; }
  .msc-quiz-answer:disabled { opacity: 1; }
  .msc-quiz-answer.is-correct { --btn-light: var(--msc-green); --btn-dark: var(--msc-green-dark); --btn-edge: var(--msc-green-edge); }
  .msc-quiz-answer.is-incorrect { --btn-light: var(--msc-red); --btn-dark: var(--msc-red-dark); --btn-edge: var(--msc-red-edge); animation: msc-shake .4s; }

  .msc-quiz-feedback { display: flex; flex-direction: column; gap: 12px; align-items: center; text-align: center; }
  .msc-quiz-feedback__headline { font-weight: 900; font-size: var(--msc-fs-title-l); }
  .msc-quiz-feedback__headline.is-correct { color: var(--msc-success); }
  .msc-quiz-feedback__headline.is-incorrect { color: var(--msc-error); }
  .msc-quiz-feedback__answer { margin: 0; color: var(--msc-text); font-weight: 700; }
  .msc-quiz-fact {
    display: flex; gap: 12px; align-items: flex-start;
    padding: 14px 16px;
    border-radius: 16px;
    background: var(--msc-panel-bottom);
    border: 3px solid var(--msc-gold);
    text-align: left;
    width: 100%;
  }
  .msc-quiz-fact__icon { width: 30px; height: 30px; flex: none; }
  .msc-quiz-fact__title { font-weight: 900; color: var(--msc-text); margin-bottom: 4px; }
  .msc-quiz-fact__text { margin: 0; color: var(--msc-text); line-height: 1.4; }
  .msc-quiz-advance-wrap { align-self: center; min-width: 200px; }

  .msc-quiz-result { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; padding-top: 8px; }
  .msc-quiz-result__score { margin: 0; color: var(--msc-text); font-weight: 700; }
  .msc-quiz-result__points {
    display: flex; align-items: center; gap: 8px;
    font-weight: 900; font-size: var(--msc-fs-title); color: var(--msc-text);
  }
  .msc-quiz-result__points-icon { width: 30px; height: 30px; }
  .msc-quiz-result__repeat-note { margin: 0; font-size: 13px; color: var(--msc-gray-text); font-weight: 700; }
  .msc-quiz-postcard {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--msc-panel-bottom);
    border: 3px solid var(--msc-success);
    color: var(--msc-success);
    font-weight: 800;
  }
  .msc-quiz-postcard__icon { width: 26px; height: 26px; }
  .msc-quiz-result .msc-dialog-actions { width: 100%; margin-top: 6px; }

  /* Невысокие окна (десктоп в развёрнутом, но не полноэкранном браузере) —
     сжимаем зазоры и кнопки ответов, чтобы прокрутка внутри stage требовалась
     как можно реже. Кнопки остаются ≥44px. */
  @media (max-height: 760px) {
    .msc-quiz-panel .msc-panel__body { gap: 8px; padding: 12px; }
    .msc-quiz-stage { gap: 10px; }
    .msc-quiz-answers { gap: 8px; }
    .msc-quiz-answer { min-height: 46px; padding: 6px 16px; }
    .msc-quiz-question__text { font-size: var(--msc-fs-body-m); }
  }

  /* ============================== МИНИ-ИГРЫ (раздел 3.6) — общий каркас:
     правила -> отсчёт -> HUD с паузой -> результат. Разметка и приёмы (single
     modal + перерисовка .stage) зеркалят .msc-quiz-*, только без вопросов. */
  .msc-minigame-panel { width: min(560px, 100%); height: 100%; }
  .msc-minigame-panel .msc-panel__body {
    height: 100%; display: flex; flex-direction: column; overflow: hidden;
  }
  .msc-minigame-stage {
    flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
    display: flex; flex-direction: column; align-items: center;
    justify-content: flex-start; gap: 18px; text-align: center;
    padding: 48px 4px 8px;
    position: relative;
  }
  /* Результат раунда — не "лист правил", по центру смотрится лучше; HUD же,
     наоборот, должен быть прижат к верху экрана, как в любой игре. */
  .msc-minigame-stage:has(.msc-minigame-result) {
    justify-content: center; padding-top: 8px;
  }
  .msc-minigame-stage:has(.msc-minigame-hud) { padding-top: 4px; }
  .msc-minigame-placeholder { margin-top: 40px; }
  /* Игровое поле — занимает всё место под HUD; canvas размечается по нему. */
  .msc-minigame-stage:has(.msc-minigame-field) { overflow: hidden; gap: 10px; }
  .msc-minigame-field {
    flex: 1; min-height: 0; width: 100%; position: relative;
    border-radius: 16px; overflow: hidden;
    border: 3px solid var(--msc-gold);
    touch-action: none; user-select: none;
  }
  .msc-minigame-canvas { position: absolute; inset: 0; display: block; cursor: pointer; }

  .msc-minigame-rules { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 420px; }
  .msc-minigame-rule {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 16px; border-radius: 16px;
    background: var(--msc-panel-bottom);
    border: 3px solid var(--msc-gold);
    text-align: left;
  }
  .msc-minigame-rule--avoid { border-color: var(--msc-red-edge); }
  .msc-minigame-rule__icon { width: 32px; height: 32px; flex: none; }
  .msc-minigame-rule__text { font-weight: 700; color: var(--msc-text); }
  .msc-minigame-rules-text { margin: 0; color: var(--msc-text); font-weight: 700; line-height: 1.4; max-width: 420px; }
  .msc-minigame-cta { min-width: 200px; }

  .msc-minigame-countdown-label { font-weight: 900; font-size: var(--msc-fs-title); color: var(--msc-text); }
  .msc-minigame-countdown-digit {
    font-size: 110px; line-height: 1; min-width: 1.2em;
  }
  .msc-minigame-countdown-digit.is-word { font-size: 48px; }

  .msc-minigame-hud {
    width: 100%; display: flex; align-items: center; gap: 14px;
    flex: none;
  }
  .msc-minigame-hud__score {
    display: flex; align-items: center; gap: 6px; flex: none;
    font-weight: 900; font-size: var(--msc-fs-title); color: var(--msc-text);
  }
  .msc-minigame-hud__score-icon { width: 26px; height: 26px; }
  .msc-minigame-hud__bar { flex: 1; }
  .msc-minigame-placeholder {
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    padding: 18px; border-radius: 16px;
    background: var(--msc-panel-bottom);
    border: 3px dashed var(--msc-gold);
    max-width: 420px;
  }
  .msc-minigame-placeholder__text { margin: 0; color: var(--msc-gray-text); font-weight: 700; line-height: 1.4; }

  .msc-minigame-pause-overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: rgba(59, 36, 20, .45);
    border-radius: inherit;
    z-index: 2;
  }
  /* Панель паузы вложена внутрь .msc-modal--full — без этого унаследует
     height:100% из общего правила ".msc-modal--full .msc-panel" (см. комментарий
     у .msc-quiz-stage .msc-quiz-question). У этого правила специфичность
     0,2,0 (два класса) — переопределяющий селектор должен быть не проще,
     иначе проигрывает независимо от порядка в файле (так уже было с одним
     классом здесь — не помогало). */
  .msc-minigame-pause-overlay .msc-minigame-pause-panel,
  .msc-minigame-pause-overlay .msc-minigame-pause-panel .msc-panel__inner { height: auto; flex: none; }
  .msc-minigame-pause-panel { width: min(320px, 90%); }
  .msc-minigame-exit-confirm {
    margin-top: 10px; padding: 12px; border-radius: 12px;
    background: rgba(217,58,43,.12);
  }
  .msc-minigame-exit-confirm .msc-dialog-actions { margin-top: 10px; }

  .msc-minigame-result { display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .msc-minigame-record {
    display: flex; align-items: center; gap: 8px;
    font-weight: 900; color: var(--msc-gold-award);
  }
  .msc-minigame-record__icon { width: 24px; height: 24px; }
  .msc-minigame-result__points {
    display: flex; align-items: center; gap: 8px;
    font-weight: 900; font-size: var(--msc-fs-title); color: var(--msc-text);
  }
  .msc-minigame-result__points-icon { width: 30px; height: 30px; }
  .msc-minigame-result__repeat-note { margin: 0; font-size: 13px; color: var(--msc-gray-text); font-weight: 700; }
  .msc-minigame-result .msc-dialog-actions { width: 100%; margin-top: 6px; }
`;

let designSystemInjected = false;

/** Внедряет CSS-переменные и базовые классы HTML/CSS-слоя окон (once per document). */
export function injectDesignSystem() {
  if (designSystemInjected || document.getElementById('msc-design-system')) return;
  designSystemInjected = true;
  const style = document.createElement('style');
  style.id = 'msc-design-system';
  style.textContent = DESIGN_TOKENS_CSS;
  document.head.appendChild(style);
}

/** JS-зеркало ключевых токенов — для случаев, когда цвет нужен не в CSS, а в JS (иконки, канвас-знаки). */
export const TOKENS = {
  ink: '#3B2414',
  text: '#4A2C14',
  gold: '#C98A3D',
  ribbon: '#2F6FB5',
  ribbonLight: '#4A8FD8',
  ribbonEdge: '#1C4E82',
  green: '#7ED957', greenDark: '#3FA535', greenEdge: '#2C7A25',
  orange: '#FFB13C', orangeDark: '#F0701A', orangeEdge: '#B04E0C',
  blue: '#5CC0F0', blueDark: '#2A8AD0', blueEdge: '#1C5E96',
  red: '#FF6B5B', redDark: '#D93A2B', redEdge: '#9C2418',
  gray: '#C9C3B8', grayEdge: '#9A9488',
  success: '#3FA535',
  error: '#D93A2B',
  goldAward: '#FFC93C',
  popMs: 250,
  fadeMs: 250,
};
