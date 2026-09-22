// Все тексты интерфейса — здесь. Правьте формулировки, не трогая код сцен.

export const STRINGS = {
  title: {
    name: 'MSC VOYAGE',
    subtitle: 'Круизное путешествие',
    play: 'Играть',
    continueGame: 'Продолжить',
    newGame: 'Новая игра',
    sound: 'Звук',
    howToPlay: 'Как играть',
  },

  tutorial: {
    step1: 'Коснитесь пола или экрана — герой пойдёт туда. На компьютере — стрелки или WASD.',
    step2: 'Подходите к предметам со значком «?», «!» или «i» — там викторины, мини-игры и интересные факты. На вопрос «Сыграть?» отвечайте Да или Нет.',
    step3: 'За викторины и мини-игры начисляются баллы. Тратьте их в магазине на экскурсии — кнопка со звездой вверху экрана.',
    next: 'Далее',
    skip: 'Пропустить',
    start: 'Начать путешествие',
  },

  hud: {
    map: 'Карта',
    postcards: 'Открытки',
    shop: 'Магазин',
    points: 'Баллы',
    cruiseExpert: 'Знаток круизов',
  },

  goals: {
    cabin: 'Осмотритесь в каюте и выходите в коридор',
    corridor: 'Загляните в гости — выберите дверь',
    restaurant: 'Отведайте атмосферу ресторана',
    pool: 'Отдохните у бассейна',
    rome: 'Погуляйте по Риму',
  },

  menu: {
    title: 'Меню',
    continue: 'Продолжить',
    soundOn: 'Звук: вкл',
    soundOff: 'Звук: выкл',
    howToPlay: 'Как играть',
    newGame: 'Новая игра',
    mainMenu: 'В главное меню',
    newGameConfirm: 'Начать заново? Баллы и покупки будут потеряны.',
    mainMenuConfirm: 'Выйти в главное меню? Текущий прогресс сохранится.',
  },

  quiz: {
    questionCounter: (i, n) => `Вопрос ${i} из ${n}`,
    correct: 'Верно!',
    incorrect: 'Не совсем',
    correctAnswerWas: (answer) => `Правильный ответ: ${answer}`,
    funFact: 'Интересный факт',
    next: 'Дальше',
    finish: 'Итог',
    exitConfirm: 'Выйти из викторины? Баллы не будут начислены.',
    resultGreat: 'Отлично!',
    resultGood: 'Хорошая работа!',
    resultTryAgain: 'Попробуйте ещё',
    scoreLine: (correct, total) => `Правильных ответов: ${correct} из ${total}`,
    pointsEarned: (n) => `Вы заработали ${n} баллов`,
    postcardUnlocked: 'Открытка получена!',
    playAgain: 'Ещё раз',
    repeatNote: 'Повторное прохождение: 20% баллов',
  },

  minigame: {
    start: 'Начать',
    ready: 'Приготовьтесь!',
    go: 'Старт!',
    pauseTitle: 'Пауза',
    resume: 'Продолжить',
    exitConfirm: 'Выйти из игры? Баллы не будут начислены.',
    simulate: 'Симулировать результат',
    placeholderNote: 'Геймплей появится на следующем этапе — пока можно проверить экраны.',
    score: 'Очки',
    resultGreat: 'Отлично!',
    resultGood: 'Хорошая работа!',
    resultTryAgain: 'Попробуйте ещё',
    pointsEarned: (n) => `Вы заработали ${n} баллов`,
    repeatNote: 'Повторное прохождение: 20% баллов',
    newRecord: 'Новый рекорд!',
    postcardUnlocked: 'Открытка получена!',
    playAgain: 'Ещё раз',
    back: 'Вернуться',
  },

  doors: {
    yes: 'Да',
    no: 'Нет',
    goTo: (label) => `Пойти: ${label}?`,
  },

  locations: {
    cabin: 'Каюта',
    corridor: 'Коридор',
    restaurant: 'Ресторан',
    pool: 'Бассейн',
    rome: 'Рим',
  },

  common: {
    close: '✕ Закрыть',
    continue: 'Продолжить',
    exit: 'Выйти',
    play: 'Играть',
    notNow: 'Не сейчас',
    back: 'Вернуться',
    again: 'Ещё раз',
    buy: 'Купить',
    bought: 'Куплено',
  },
};
