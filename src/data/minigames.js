// Общие данные трёх мини-игр (раздел 3.6 ТЗ этапа 2) — только то, что нужно
// каркасу экранов (правила/иконки/жизни). Сам геймплей — отдельный этап,
// здесь у каждой игры вместо него заглушка "Симулировать результат".
// postcardId — по аналогии с HOTSPOT_QUIZ в illustratedBootstrap.js.

export const MINIGAMES = {
  catchFoodMinigame: {
    id: 'catchFoodMinigame',
    title: 'Поймай итальянское',
    doIcon: 'check',
    doText: 'Ловите итальянскую еду',
    avoidIcon: 'exclaim',
    avoidText: 'Избегайте не итальянской кухни',
    rules: 'Итальянская еда падает сверху — ловите её корзиной. Другая кухня отнимает жизнь.',
    lives: 3,
    durationSec: 45,
    postcardId: 'restaurant',
  },
  ballMinigame: {
    id: 'ballMinigame',
    title: 'Не урони мяч',
    doIcon: 'check',
    doText: 'Удерживайте мяч в воздухе',
    avoidIcon: 'exclaim',
    avoidText: 'Не давайте мячу упасть',
    rules: 'Следите за мячом и не давайте ему коснуться воды. Каждое падение — потерянная жизнь.',
    lives: 3,
    postcardId: 'pool',
  },
  coinsMinigame: {
    id: 'coinsMinigame',
    title: 'Монетки Треви',
    doIcon: 'check',
    doText: 'Собирайте монетки на бегу',
    avoidIcon: 'exclaim',
    avoidText: 'Обходите препятствия на площади',
    rules: 'Собирайте как можно больше монет за отведённое время, обходя препятствия.',
    lives: 3,
    postcardId: 'trevi',
  },
};
