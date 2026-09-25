// Общие данные трёх мини-игр (раздел 3.6 ТЗ этапа 2) — только то, что нужно
// каркасу экранов (правила/иконки/жизни/длительность). Геймплей — в
// src/minigames/*, подключается в src/ui/minigameScreen.js (GAMEPLAY).
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
    doText: 'Отбивайте мяч ракеткой, ловите звёзды и монеты',
    avoidIcon: 'exclaim',
    avoidText: 'Не роняйте мяч в воду, уворачивайтесь от ежей и капель',
    rules: 'Двигайте ракетку по бортику и не давайте мячу упасть в бассейн. Сердце возвращает жизнь.',
    lives: 3,
    durationSec: 45,
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
