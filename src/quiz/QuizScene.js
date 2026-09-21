// Универсальный движок викторины: вопрос -> обратная связь -> ... -> итог.
// Работает с любым набором вопросов из data/quizzes.js.

import { PALETTE } from '../art/palette.js';
import { drawText, measureText, wrapText } from '../art/font.js';
import { drawPanel, drawButton, hitTest } from '../engine/ui.js';
import { createExitConfirmDialog } from '../engine/dialogs.js';
import { STRINGS } from '../data/strings.ru.js';
import { CONFIG } from '../data/config.js';
import { Storage } from '../engine/storage.js';
import { Sound } from '../engine/sound.js';

const SCREEN_W = CONFIG.screen.width;
const SCREEN_H = CONFIG.screen.height;

export class QuizScene {
  /**
   * @param {{quiz: object, postcardId?: string, onFinish: (result:{points:number})=>void}} opts
   */
  constructor({ quiz, postcardId, onFinish }) {
    this.quiz = quiz;
    this.postcardId = postcardId;
    this.onFinish = onFinish;

    this.step = 'question'; // question | feedback | result
    this.index = 0;
    this.correctCount = 0;
    this.selectedIndex = null;
    this.exitDialog = null;

    this.answerRects = [];
    this.continueRect = null;
    this.closeRect = null;
    this.finishRect = null;
    this.shopRect = null;

    this.pointsAwarded = 0;
    this.pointsDisplay = 0;
  }

  enter() {
    Sound.click();
  }

  _currentQuestion() {
    return this.quiz.questions[this.index];
  }

  update(dt, input) {
    if (input.isCancelPressed()) {
      if (!this.exitDialog) this._openExitConfirm();
      // Esc в открытом диалоге подтверждения = "продолжить викторину" (ничего не делаем)
    }

    const tap = input.consumeTap();
    if (tap) this.handleTap(tap);

    if (!this.exitDialog && this.step === 'result' && this.pointsDisplay < this.pointsAwarded) {
      this.pointsDisplay = Math.min(this.pointsAwarded, this.pointsDisplay + Math.ceil(this.pointsAwarded * dt * 2));
    }
  }

  _openExitConfirm() {
    this.exitDialog = createExitConfirmDialog(SCREEN_W, SCREEN_H);
    Sound.click();
  }

  handleTap(point) {
    if (this.exitDialog) {
      const action = this.exitDialog.handleTap(point);
      if (action === 'confirm') {
        this.exitDialog = null;
      } else if (action === 'cancel') {
        this.onFinish({ points: 0, exitedEarly: true });
      }
      return;
    }

    if (hitTest(this.closeRect, point)) {
      this._openExitConfirm();
      return;
    }

    if (this.step === 'question') {
      for (let i = 0; i < this.answerRects.length; i++) {
        if (hitTest(this.answerRects[i], point)) {
          this._selectAnswer(i);
          return;
        }
      }
    } else if (this.step === 'feedback') {
      if (hitTest(this.continueRect, point)) {
        this._advance();
      }
    } else if (this.step === 'result') {
      if (hitTest(this.finishRect, point)) {
        this.onFinish({ points: this.pointsAwarded, exitedEarly: false });
      }
    }
  }

  _selectAnswer(i) {
    this.selectedIndex = i;
    const correct = i === this._currentQuestion().correctIndex;
    if (correct) {
      this.correctCount++;
      Sound.correct();
    } else {
      Sound.wrong();
    }
    this.step = 'feedback';
  }

  _advance() {
    this.index++;
    this.selectedIndex = null;
    if (this.index >= this.quiz.questions.length) {
      this._finishQuiz();
    } else {
      this.step = 'question';
    }
  }

  _finishQuiz() {
    const total = this.quiz.questions.length;
    const wasCompletedBefore = Storage.isQuizCompleted(this.quiz.id);
    const perfect = this.correctCount === total;

    let points = this.correctCount * CONFIG.points.quizCorrectAnswer;
    if (perfect) points += CONFIG.points.quizPerfectBonus;
    if (wasCompletedBefore) points = Math.round(points * CONFIG.points.repeatMultiplier);

    Storage.markQuizCompleted(this.quiz.id);
    if (this.postcardId) Storage.unlockPostcard(this.postcardId);
    if (points > 0) Storage.addPoints(points);

    this.pointsAwarded = points;
    this.pointsDisplay = 0;
    this.step = 'result';
    Sound.points();
  }

  draw(ctx) {
    ctx.fillStyle = PALETTE.uiPanelDark;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    drawText(ctx, this.quiz.title, 12, 10, { scale: 1, color: PALETTE.ink });
    const closeLabel = STRINGS.common.close;
    const closeW = measureText(closeLabel, 1) + 12;
    this.closeRect = drawButton(ctx, SCREEN_W - 10 - closeW, 6, closeW, 16, closeLabel);

    if (this.step === 'question') this._drawQuestion(ctx);
    else if (this.step === 'feedback') this._drawFeedback(ctx);
    else if (this.step === 'result') this._drawResult(ctx);

    if (this.exitDialog) this.exitDialog.draw(ctx);
  }

  _drawProgress(ctx) {
    const progress = `${this.index + 1}/${this.quiz.questions.length}`;
    drawText(ctx, progress, SCREEN_W - 16 - measureText(progress, 1), 26, { scale: 1, color: PALETTE.inkSoft });
  }

  _drawQuestion(ctx) {
    const q = this._currentQuestion();
    this._drawProgress(ctx);

    const lines = wrapText(q.question, 30);
    const panelH = 20 + lines.length * 10;
    drawPanel(ctx, 10, 30, SCREEN_W - 20, panelH);
    lines.forEach((line, i) => {
      drawText(ctx, line, 18, 40 + i * 10, { scale: 1, color: PALETTE.ink });
    });

    this.answerRects = [];
    let y = 30 + panelH + 10;
    q.answers.forEach((answer, i) => {
      const answerLines = wrapText(answer, 32);
      const h = 12 + answerLines.length * 9;
      const rect = drawButton(ctx, 14, y, SCREEN_W - 28, h, '', {});
      answerLines.forEach((line, li) => {
        const lineW = measureText(line, 1);
        drawText(ctx, line, 14 + (rect.w - lineW) / 2, y + 6 + li * 9, { scale: 1, color: PALETTE.ink });
      });
      this.answerRects.push(rect);
      y += h + 6;
    });
  }

  _drawFeedback(ctx) {
    const q = this._currentQuestion();
    this._drawProgress(ctx);
    const correct = this.selectedIndex === q.correctIndex;

    const headline = correct ? 'Верно!' : 'Не совсем';
    drawText(ctx, headline, 18, 40, { scale: 1, color: correct ? PALETTE.uiSuccess : PALETTE.uiDanger });

    const rightAnswer = `Правильный ответ: ${q.answers[q.correctIndex]}`;
    const rightLines = wrapText(rightAnswer, 32);
    let y = 54;
    if (!correct) {
      rightLines.forEach((line) => {
        drawText(ctx, line, 18, y, { scale: 1, color: PALETTE.ink });
        y += 10;
      });
      y += 4;
    }

    const factLines = wrapText(q.fact, 32);
    const panelH = 14 + factLines.length * 10;
    drawPanel(ctx, 10, y, SCREEN_W - 20, panelH);
    factLines.forEach((line, i) => {
      drawText(ctx, line, 18, y + 8 + i * 10, { scale: 1, color: PALETTE.inkSoft });
    });

    const isLast = this.index >= this.quiz.questions.length - 1;
    this.continueRect = drawButton(
      ctx, SCREEN_W / 2 - 45, SCREEN_H - 44, 90, 24,
      isLast ? 'Итог' : STRINGS.tutorial.next,
      { accent: true },
    );
  }

  _drawResult(ctx) {
    const total = this.quiz.questions.length;
    drawText(ctx, 'Викторина пройдена!', 18, 50, { scale: 1, color: PALETTE.ink });
    drawText(ctx, `Правильных ответов: ${this.correctCount} из ${total}`, 18, 66, { scale: 1, color: PALETTE.inkSoft });

    drawPanel(ctx, SCREEN_W / 2 - 60, 90, 120, 44);
    const pointsLabel = `+${this.pointsDisplay} ${STRINGS.hud.points.toUpperCase()}`;
    const labelW = measureText(pointsLabel, 1);
    drawText(ctx, pointsLabel, SCREEN_W / 2 - labelW / 2, 108, { scale: 1, color: PALETTE.uiGold });

    if (this.postcardId) {
      drawText(ctx, 'Открытка получена!', 18, 150, { scale: 1, color: PALETTE.uiSuccess });
    }

    this.finishRect = drawButton(ctx, SCREEN_W / 2 - 45, SCREEN_H - 44, 90, 24, STRINGS.common.back, { accent: true });
  }
}
