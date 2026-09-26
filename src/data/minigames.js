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
    doText: 'Отбивайте мяч надувным матрасом, ловите звёзды и монеты',
    avoidIcon: 'exclaim',
    avoidText: 'Не роняйте мяч в воду, уворачивайтесь от ежей и капель',
    rules: 'Двигайте матрас по воде и не давайте мячу упасть в бассейн. Куда мяч попал на матрасе — туда и отлетит. Сердце возвращает жизнь.',
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
    avoidText: 'Перепрыгивайте скутеры, чемоданы и туристов',
    rules: 'Нажмите на экран или пробел, чтобы прыгнуть. Монетки над препятствиями собираются в прыжке.',
    lives: 3,
    durationSec: 45,
    postcardId: 'trevi',
  },
};
