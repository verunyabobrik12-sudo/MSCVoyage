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
