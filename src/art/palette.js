// Единая палитра игры (~40 цветов). Тёплая, насыщенная — в духе Catz (Gameloft).
// Менять цвета всей игры — только здесь.

export const PALETTE = {
  // Базовые нейтральные
  ink: '#2b1d14',        // тёмная обводка контуров
  inkSoft: '#4a3626',    // мягкая обводка/тень на светлом
  white: '#fff6e6',
  cream: '#fbe9c8',

  // Дерево / пол / мебель
  woodLight: '#e8b25c',
  woodMid: '#c98a3a',
  woodDark: '#8a5a24',
  woodPlank: '#d99c46',

  // Ковры/ткани тёплые
  carpetRed: '#b23a34',
  carpetRedDark: '#8a2a26',
  fabricGold: '#e0a83e',
  fabricBlue: '#3d6ea5',
  fabricBlueDark: '#2b4f7a',

  // Стены
  wallCream: '#f2dcae',
  wallCreamDark: '#dcc088',
  wallBlue: '#a9c9d6',
  wallBlueDark: '#7fa5b6',

  // Море/небо/вода
  seaDeep: '#1f6f8b',
  seaMid: '#3a95ab',
  seaLight: '#7fc4c9',
  seaFoam: '#e8f7f3',
  skyDay: '#bfe6f2',
  skyHorizon: '#eaf6e0',
  poolWater: '#4fb8c9',
  poolWaterLight: '#8fe0e0',
  poolWaterDark: '#2f8a9c',

  // Кожа/персонажи
  skinLight: '#eec19a',
  skinMid: '#d99e6f',
  hairBrown: '#5b3a24',
  hairBlack: '#2b2018',
  hairBlonde: '#dcb35c',

  // Одежда
  clothRed: '#c94f3f',
  clothBlue: '#3f6fa8',
  clothGreen: '#4f9a5c',
  clothYellow: '#e0b23e',
  clothWhite: '#f4ece0',
  clothNavy: '#2c3f5e',

  // Акценты/еда/растения
  accentGold: '#e8b23e',
  accentOrange: '#e0743e',
  tomatoRed: '#c9432f',
  leafGreen: '#5c9a4f',
  leafDark: '#3d6e35',
  cheeseYellow: '#eecb5c',
  espressoBrown: '#3d281a',
  creamCake: '#f2e0c0',

  // Рим/камень
  stoneLight: '#d8cdb8',
  stoneMid: '#b8a988',
  stoneDark: '#8c7d5e',
  brickTerracotta: '#c9703f',
  brickDark: '#a1552c',

  // UI
  uiPanel: '#fbe9c8',
  uiPanelDark: '#e0c393',
  uiBorder: '#8a5a24',
  uiAccent: '#3d6ea5',
  uiGold: '#e8b23e',
  uiDanger: '#c9432f',
  uiSuccess: '#4f9a5c',
  uiShadow: 'rgba(43,29,20,0.35)',
};

// Быстрая палитра для теней: затемнение цвета на заданный процент.
export function shade(hex, percent) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) * (1 - percent)));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) * (1 - percent)));
  const b = Math.max(0, Math.min(255, (n & 0xff) * (1 - percent)));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
