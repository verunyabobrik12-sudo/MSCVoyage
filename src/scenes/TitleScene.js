// Титульный экран: выбор персонажа, кнопки "Играть"/"Звук"/"Как играть",
// вводный туториал в 3 шага перед первым стартом.

import { CONFIG } from '../data/config.js';
import { STRINGS } from '../data/strings.ru.js';
import { PALETTE } from '../art/palette.js';
import { Assets } from '../art/assets.js';
import { drawText, measureText, wrapText } from '../art/font.js';
import { drawPanel, drawButton, hitTest } from '../engine/ui.js';
import { Storage } from '../engine/storage.js';
import { Sound } from '../engine/sound.js';

const SCREEN_W = CONFIG.screen.width;
const SCREEN_H = CONFIG.screen.height;

export class TitleScene {
  constructor({ game }) {
    this.game = game;
    this.mode = 'select'; // select | tutorial
    this.tutorialStep = 0;
    this.selectedCharacter = Storage.get().character || 'girl';
    this.time = 0;

    this.girlRect = null;
    this.boyRect = null;
    this.playRect = null;
    this.soundRect = null;
    this.howToRect = null;
    this.nextRect = null;
  }

  enter() {
    this.mode = 'select';
  }

  update(dt) {
    this.time += dt;
    const tap = this.game.input.consumeTap();
    if (tap) this._handleTap(tap);
  }

  _handleTap(point) {
    if (this.mode === 'tutorial') {
      if (hitTest(this.nextRect, point)) {
        Sound.click();
        if (this.tutorialStep >= 2) {
          Storage.set({ tutorialSeen: true });
          this._startGame();
        } else {
          this.tutorialStep++;
        }
      }
      return;
    }

    if (hitTest(this.girlRect, point)) {
      this.selectedCharacter = 'girl';
      Storage.set({ character: 'girl' });
      Sound.click();
    } else if (hitTest(this.boyRect, point)) {
      this.selectedCharacter = 'boy';
      Storage.set({ character: 'boy' });
      Sound.click();
    } else if (hitTest(this.playRect, point)) {
      Sound.click();
      if (!Storage.get().tutorialSeen) {
        this.mode = 'tutorial';
        this.tutorialStep = 0;
      } else {
        this._startGame();
      }
    } else if (hitTest(this.soundRect, point)) {
      Sound.toggleMute();
      Sound.click();
    } else if (hitTest(this.howToRect, point)) {
      Sound.click();
      this.mode = 'tutorial';
      this.tutorialStep = 0;
    }
  }

  _startGame() {
    this.game.startVoyage();
  }

  draw(ctx) {
    this._drawBackground(ctx);
    if (this.mode === 'tutorial') this._drawTutorial(ctx);
    else this._drawSelect(ctx);
  }

  _drawBackground(ctx) {
    ctx.fillStyle = PALETTE.skyDay;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H - 60);
    ctx.fillStyle = PALETTE.seaMid;
    ctx.fillRect(0, SCREEN_H - 60, SCREEN_W, 60);

    // Волны
    ctx.strokeStyle = PALETTE.seaFoam;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = SCREEN_H - 50 + i * 12;
      ctx.beginPath();
      for (let x = 0; x <= SCREEN_W; x += 4) {
        const wave = Math.sin(x * 0.15 + this.time * 2 + i) * 2;
        ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    // Лайнер-силуэт (заглушка логотипа) — только на экране выбора, чтобы не вылезать из-под туториала
    if (this.mode === 'select') {
      const shipY = SCREEN_H - 90 + Math.sin(this.time * 1.5) * 2;
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(SCREEN_W / 2 - 40, shipY, 80, 14);
      ctx.fillStyle = PALETTE.uiAccent;
      ctx.fillRect(SCREEN_W / 2 - 40, shipY - 8, 80, 8);
      ctx.fillStyle = PALETTE.accentOrange;
      ctx.fillRect(SCREEN_W / 2 - 4, shipY - 20, 8, 12);
    }

    const title = STRINGS.title.name;
    const titleW = measureText(title, 2);
    drawText(ctx, title, SCREEN_W / 2 - titleW / 2, 26, { scale: 2, color: PALETTE.ink });
    const subtitleW = measureText(STRINGS.title.subtitle, 1);
    drawText(ctx, STRINGS.title.subtitle, SCREEN_W / 2 - subtitleW / 2, 48, { scale: 1, color: PALETTE.inkSoft });
  }

  _drawSelect(ctx) {
    // Вертикальные позиции — в долях высоты экрана, чтобы раскладка не "сплющивалась"
    // в верхней части при смене логического разрешения игры.
    const cardW = 80;
    const cardH = 90;
    const gap = 10;
    const startX = SCREEN_W / 2 - cardW - gap / 2;
    const cardY = Math.round(SCREEN_H * 0.23);
    const playY = Math.round(SCREEN_H * 0.52);
    const rowY = Math.round(SCREEN_H * 0.60);

    this.girlRect = this._drawCharacterCard(ctx, startX, cardY, cardW, cardH, 'girl', 'Она');
    this.boyRect = this._drawCharacterCard(ctx, startX + cardW + gap, cardY, cardW, cardH, 'boy', 'Он');

    this.playRect = drawButton(ctx, SCREEN_W / 2 - 60, playY, 120, 30, STRINGS.title.play, { accent: true });
    this.soundRect = drawButton(ctx, SCREEN_W / 2 - 60, rowY, 56, 24, `${STRINGS.title.sound}: ${Sound.isMuted() ? 'ВЫКЛ' : 'ВКЛ'}`);
    this.howToRect = drawButton(ctx, SCREEN_W / 2 + 4, rowY, 56, 24, STRINGS.title.howToPlay);
  }

  _drawCharacterCard(ctx, x, y, w, h, character, label) {
    const selected = this.selectedCharacter === character;
    drawPanel(ctx, x, y, w, h, { border: selected ? PALETTE.uiGold : PALETTE.uiBorder });
    Assets.drawPlayer(ctx, character, x + w / 2, y + h - 20, 'down', this.time, false);
    const labelW = measureText(label, 1);
    drawText(ctx, label, x + (w - labelW) / 2, y + h - 14, { scale: 1, color: PALETTE.ink });
    return { x, y, w, h };
  }

  _drawTutorial(ctx) {
    const steps = [STRINGS.tutorial.step1, STRINGS.tutorial.step2, STRINGS.tutorial.step3];
    const message = steps[this.tutorialStep];
    const lines = wrapText(message, 26);

    const w = 200;
    const h = 90 + lines.length * 10;
    const x = SCREEN_W / 2 - w / 2;
    const y = SCREEN_H / 2 - h / 2;

    drawPanel(ctx, x, y, w, h);
    const stepLabel = `Шаг ${this.tutorialStep + 1} из 3`;
    drawText(ctx, stepLabel, x + 12, y + 10, { scale: 1, color: PALETTE.inkSoft });

    lines.forEach((line, i) => {
      drawText(ctx, line, x + 12, y + 26 + i * 10, { scale: 1, color: PALETTE.ink });
    });

    const isLast = this.tutorialStep >= 2;
    this.nextRect = drawButton(
      ctx, x + w / 2 - 55, y + h - 32, 110, 22,
      isLast ? STRINGS.tutorial.start : STRINGS.tutorial.next,
      { accent: true },
    );
  }
}
