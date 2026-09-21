// Обёртка над localStorage: хранит весь прогресс игрока одним объектом.

const STORAGE_KEY = 'mscvoyage_save_v1';

function defaultState() {
  return {
    character: null, // 'girl' | 'boy'
    points: 0,
    muted: false,
    completedQuizzes: {}, // { quizId: true }
    completedMinigames: {}, // { gameId: { best: number, playedOnce: true } }
    postcards: {}, // { postcardId: true }
    purchasedExcursions: {}, // { excursionId: true }
    tutorialSeen: false,
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Не удалось прочитать сохранение, начинаем заново', e);
    return defaultState();
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Не удалось сохранить прогресс', e);
  }
}

export const Storage = {
  get() {
    return state;
  },
  set(patch) {
    state = { ...state, ...patch };
    save();
  },
  addPoints(amount) {
    state.points = Math.max(0, state.points + amount);
    save();
    return state.points;
  },
  markQuizCompleted(quizId) {
    const wasCompleted = !!state.completedQuizzes[quizId];
    state.completedQuizzes = { ...state.completedQuizzes, [quizId]: true };
    save();
    return wasCompleted;
  },
  isQuizCompleted(quizId) {
    return !!state.completedQuizzes[quizId];
  },
  markMinigamePlayed(gameId, score) {
    const prev = state.completedMinigames[gameId];
    const wasPlayed = !!prev;
    const best = prev ? Math.max(prev.best, score) : score;
    const isRecord = !prev || score > prev.best;
    state.completedMinigames = { ...state.completedMinigames, [gameId]: { best, playedOnce: true } };
    save();
    return { wasPlayed, isRecord };
  },
  unlockPostcard(postcardId) {
    if (state.postcards[postcardId]) return false;
    state.postcards = { ...state.postcards, [postcardId]: true };
    save();
    return true;
  },
  purchaseExcursion(excursionId) {
    state.purchasedExcursions = { ...state.purchasedExcursions, [excursionId]: true };
    save();
  },
  reset() {
    state = defaultState();
    save();
  },
};
