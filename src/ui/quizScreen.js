// Викторина целиком (раздел 3.5 ТЗ этапа 2): вопрос -> обратная связь -> ...
// -> итог. Правила баллов и хранение — как раньше в src/quiz/QuizScene.js
// (тот же Storage/CONFIG), меняется только вид и подача — теперь HTML/CSS
// вместо canvas.

import {
  createPanel, createRibbon, createButton, createModal, createCloseButton,
  createProgressDots, createStarRow, flyCoinsTo, spawnConfetti,
} from './components.js';
import { icon } from './icons.js';
import { STRINGS } from '../data/strings.ru.js';
import { CONFIG } from '../data/config.js';
import { Storage } from '../engine/storage.js';
import { Sound } from '../engine/sound.js';

const ANSWER_LETTERS = ['A', 'B', 'C', 'D'];
const ANSWER_COLORS = ['blue', 'orange', 'green', 'red'];

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

/**
 * @param {{container:HTMLElement, quiz:object, postcardId?:string, pointsBadgeEl:HTMLElement,
 *          onPointsChanged:(n:number)=>void, onFinish:Function}} opts
 */
/** Тасует массив (Фишер—Йейтс), не трогая исходный. */
function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function openQuiz({ container, quiz, postcardId, pointsBadgeEl, onPointsChanged, onFinish }) {
  const total = quiz.questions.length;
  let index = 0;
  let correctCount = 0;
  let locked = false;
  // Порядок вариантов ответа перемешивается при каждом показе вопроса — иначе
  // правильный ответ у части вопросов в data/quizzes.js всегда стоит первым
  // (записан так в исходных данных), и с буквами A/B/C/D это сразу заметно.
  let order = [];

  const { el: panel, body } = createPanel({ className: 'msc-quiz-panel' });
  const closeBtn = createCloseButton({ onClick: () => confirmExit() });
  panel.appendChild(closeBtn);

  const header = el('div', 'msc-quiz-header');
  header.appendChild(createRibbon(quiz.title, { wrap: true }));
  const counter = el('div', 'msc-quiz-counter');
  header.appendChild(counter);
  body.appendChild(header);

  const dotsHost = el('div', 'msc-quiz-dots');
  body.appendChild(dotsHost);

  const stage = el('div', 'msc-quiz-stage');
  body.appendChild(stage);

  const modal = createModal({ bodyEl: panel, container, full: true, onRequestClose: () => confirmExit() });

  function onKeydown(e) {
    if (exitModal) return; // подтверждение выхода перехватывает клавиши само
    if (e.key >= '1' && e.key <= '4') {
      const i = Number(e.key) - 1;
      const btn = stage.querySelectorAll('.msc-quiz-answer')[i];
      if (btn && !locked) { e.preventDefault(); btn.click(); }
    } else if (e.key === 'Enter' || e.key === ' ') {
      const advanceBtn = stage.querySelector('.msc-quiz-advance');
      if (advanceBtn) { e.preventDefault(); advanceBtn.click(); }
    }
  }

  let exitModal = null;
  function confirmExit() {
    if (exitModal) return;
    const { el: exPanel, body: exBody } = createPanel();
    exBody.appendChild(el('p', 'msc-dialog-text', { text: STRINGS.quiz.exitConfirm }));
    const actions = el('div', 'msc-dialog-actions');
    const stay = createButton({ label: STRINGS.common.continue, variant: 'green' });
    const leave = createButton({ label: STRINGS.common.exit, variant: 'red' });
    actions.appendChild(stay.el);
    actions.appendChild(leave.el);
    exBody.appendChild(actions);
    exitModal = createModal({
      bodyEl: exPanel,
      container,
      onRequestClose: () => { exitModal.close(); exitModal = null; },
    });
    stay.button.addEventListener('click', () => { exitModal.close(); exitModal = null; });
    leave.button.addEventListener('click', () => {
      exitModal.close();
      exitModal = null;
      closeAll();
    });
    exitModal.open();
  }

  function closeAll() {
    document.removeEventListener('keydown', onKeydown);
    modal.close();
    onFinish?.();
  }

  function renderProgress() {
    dotsHost.innerHTML = '';
    dotsHost.appendChild(createProgressDots(total, index));
    counter.textContent = STRINGS.quiz.questionCounter(index + 1, total);
  }

  function renderQuestion() {
    locked = false;
    renderProgress();
    stage.innerHTML = '';
    const q = quiz.questions[index];

    const { el: qPanel, body: qBody } = createPanel({ className: 'msc-quiz-question' });
    qBody.appendChild(el('p', 'msc-quiz-question__text', { text: q.question }));
    stage.appendChild(qPanel);

    order = shuffle(q.answers.map((_, i) => i));

    const answers = el('div', 'msc-quiz-answers');
    order.forEach((originalIndex, displayIndex) => {
      const btn = el('button', `msc-btn msc-btn--${ANSWER_COLORS[displayIndex]} msc-btn--l msc-quiz-answer`, { type: 'button' });
      btn.appendChild(el('span', 'msc-quiz-answer__badge', { text: ANSWER_LETTERS[displayIndex] }));
      btn.appendChild(el('span', 'msc-btn__label msc-outline-text msc-quiz-answer__text', { text: q.answers[originalIndex] }));
      btn.appendChild(el('span', 'msc-btn__shine'));
      btn.addEventListener('click', () => selectAnswer(displayIndex));
      answers.appendChild(btn);
    });
    stage.appendChild(answers);
  }

  function selectAnswer(displayIndex) {
    if (locked) return;
    locked = true;
    const q = quiz.questions[index];
    const correct = order[displayIndex] === q.correctIndex;
    const correctDisplayIndex = order.indexOf(q.correctIndex);
    const buttons = stage.querySelectorAll('.msc-quiz-answer');
    buttons.forEach((b) => { b.disabled = true; });
    buttons[correctDisplayIndex].classList.add('is-correct');
    buttons[correctDisplayIndex].appendChild(el('span', 'msc-quiz-answer__mark', { html: icon('check') }));
    if (correct) {
      correctCount += 1;
      Sound.correct();
      spawnConfetti(stage, { count: 18 });
    } else {
      buttons[displayIndex].classList.add('is-incorrect');
      Sound.wrong();
      modal.modal.classList.remove('msc-modal--shake');
      void modal.modal.offsetWidth;
      modal.modal.classList.add('msc-modal--shake');
    }

    const feedback = el('div', 'msc-quiz-feedback msc-pop');
    const headline = el('div', correct ? 'msc-quiz-feedback__headline is-correct' : 'msc-quiz-feedback__headline is-incorrect', {
      text: correct ? STRINGS.quiz.correct : STRINGS.quiz.incorrect,
    });
    feedback.appendChild(headline);
    if (!correct) feedback.appendChild(el('p', 'msc-quiz-feedback__answer', { text: STRINGS.quiz.correctAnswerWas(q.answers[q.correctIndex]) }));
    const factBox = el('div', 'msc-quiz-fact');
    factBox.appendChild(el('span', 'msc-quiz-fact__icon', { html: icon('bulb') }));
    const factText = el('div', 'msc-quiz-fact__body');
    factText.appendChild(el('div', 'msc-quiz-fact__title', { text: STRINGS.quiz.funFact }));
    factText.appendChild(el('p', 'msc-quiz-fact__text', { text: q.fact }));
    factBox.appendChild(factText);
    feedback.appendChild(factBox);

    const isLast = index >= total - 1;
    const nextBtn = createButton({ label: isLast ? STRINGS.quiz.finish : STRINGS.quiz.next, variant: 'green', size: 'l' });
    nextBtn.el.classList.add('msc-quiz-advance-wrap');
    nextBtn.button.classList.add('msc-quiz-advance');
    nextBtn.button.addEventListener('click', () => {
      index += 1;
      if (index >= total) renderResult();
      else renderQuestion();
    });
    feedback.appendChild(nextBtn.el);
    stage.appendChild(feedback);
    nextBtn.button.focus();
  }

  function renderResult() {
    dotsHost.innerHTML = '';
    counter.textContent = '';
    stage.innerHTML = '';

    const percent = correctCount / total;
    let stars = 0;
    let headline = STRINGS.quiz.resultTryAgain;
    if (percent === 1) { stars = 3; headline = STRINGS.quiz.resultGreat; }
    else if (percent >= 0.5) { stars = 2; headline = STRINGS.quiz.resultGood; }
    else if (percent > 0) { stars = 1; headline = STRINGS.quiz.resultGood; }

    const wasCompletedBefore = Storage.isQuizCompleted(quiz.id);
    let points = correctCount * CONFIG.points.quizCorrectAnswer;
    if (percent === 1) points += CONFIG.points.quizPerfectBonus;
    if (wasCompletedBefore) points = Math.round(points * CONFIG.points.repeatMultiplier);

    Storage.markQuizCompleted(quiz.id);
    const postcardUnlocked = postcardId ? Storage.unlockPostcard(postcardId) : false;
    if (points > 0) Storage.addPoints(points);
    Sound.points();

    const result = el('div', 'msc-quiz-result');
    result.appendChild(createRibbon(headline));
    result.appendChild(createStarRow(stars));
    result.appendChild(el('p', 'msc-quiz-result__score', { text: STRINGS.quiz.scoreLine(correctCount, total) }));
    const pointsLine = el('div', 'msc-quiz-result__points');
    pointsLine.appendChild(el('span', 'msc-quiz-result__points-icon', { html: icon('coin') }));
    pointsLine.appendChild(el('span', null, { text: STRINGS.quiz.pointsEarned(points) }));
    result.appendChild(pointsLine);
    if (wasCompletedBefore) result.appendChild(el('p', 'msc-quiz-result__repeat-note', { text: STRINGS.quiz.repeatNote }));

    if (postcardUnlocked) {
      const postcard = el('div', 'msc-quiz-postcard');
      postcard.appendChild(el('span', 'msc-quiz-postcard__icon', { html: icon('postcard') }));
      postcard.appendChild(el('span', null, { text: STRINGS.quiz.postcardUnlocked }));
      result.appendChild(postcard);
    }

    const actions = el('div', 'msc-dialog-actions');
    const again = createButton({ label: STRINGS.quiz.playAgain, variant: 'orange', size: 'l' });
    const done = createButton({ label: STRINGS.common.continue, variant: 'green', size: 'l' });
    again.button.addEventListener('click', () => { index = 0; correctCount = 0; renderQuestion(); });
    done.button.addEventListener('click', () => closeAll());
    actions.appendChild(again.el);
    actions.appendChild(done.el);
    result.appendChild(actions);
    stage.appendChild(result);
    done.button.focus();

    if (points > 0 && pointsBadgeEl) {
      const source = result.querySelector('.msc-quiz-result__points-icon');
      flyCoinsTo(source, pointsBadgeEl, Math.min(8, Math.max(3, Math.round(points / 5)))).then(() => {
        onPointsChanged?.(Storage.get().points);
      });
    } else {
      onPointsChanged?.(Storage.get().points);
    }
  }

  document.addEventListener('keydown', onKeydown);
  modal.open();
  renderQuestion();
}
