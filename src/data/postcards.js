// Открытки (раздел 3.9): по одной за каждое задание игры. id совпадает с
// postcardId, который открывают викторины (HOTSPOT_QUIZ в illustratedBootstrap)
// и мини-игры (src/data/minigames.js). Картинки — assets/postcards/*.jpg
// (tools/prepare_postcards.ps1). Подписи — описание картинки, без фактов,
// которые нужно было бы проверять.

export const POSTCARDS = [
  { id: 'cabin', title: 'Каюта', caption: 'Каюта с балконом и видом на море', hint: 'Пройдите викторину в каюте', image: 'assets/postcards/cabin.jpg' },
  { id: 'restaurant', title: 'Ресторан', caption: 'Ресторан на борту лайнера', hint: 'Сыграйте в «Поймай итальянское» в ресторане', image: 'assets/postcards/restaurant.jpg' },
  { id: 'pool', title: 'Бассейн', caption: 'Бассейн на верхней палубе', hint: 'Сыграйте в «Не урони мяч» у бассейна', image: 'assets/postcards/pool.jpg' },
  { id: 'rome', title: 'Рим', caption: 'Площадь в Риме', hint: 'Пройдите викторину на площади в Риме', image: 'assets/postcards/rome.jpg' },
  { id: 'trevi', title: 'Фонтан Треви', caption: 'Финиш забега по Риму', hint: 'Сыграйте в «Монетки Треви» в Риме', image: 'assets/postcards/trevi.jpg' },
];
