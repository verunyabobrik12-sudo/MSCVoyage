// Управление сценами с плавным затемнением при переходах.
// Сцена — объект с методами enter(), exit(), update(dt, input), draw(ctx).

import { CONFIG } from '../data/config.js';

export class SceneManager {
  constructor() {
    this.current = null;
    this.pendingScene = null;
    this.state = 'idle'; // idle | fadeOut | fadeIn
    this.timer = 0;
    this.halfDuration = CONFIG.transitionMs / 2;
  }

  /** Мгновенный переход без затемнения — используется один раз при старте игры. */
  setInitial(scene) {
    this.current = scene;
    scene.enter?.();
  }

  /** Переход с затемнением на новую сцену. */
  goto(scene) {
    if (this.state !== 'idle') return;
    this.pendingScene = scene;
    this.state = 'fadeOut';
    this.timer = 0;
  }

  isTransitioning() {
    return this.state !== 'idle';
  }

  update(dt, input) {
    if (this.state === 'idle') {
      this.current?.update(dt, input);
      return;
    }

    this.timer += dt * 1000;
    if (this.state === 'fadeOut' && this.timer >= this.halfDuration) {
      this.current?.exit?.();
      this.current = this.pendingScene;
      this.pendingScene = null;
      this.current.enter?.();
      this.state = 'fadeIn';
      this.timer = 0;
    } else if (this.state === 'fadeIn' && this.timer >= this.halfDuration) {
      this.state = 'idle';
      this.timer = 0;
    }
  }

  draw(ctx, w, h) {
    this.current?.draw(ctx);

    if (this.state === 'idle') return;
    const progress = Math.min(1, this.timer / this.halfDuration);
    const alpha = this.state === 'fadeOut' ? progress : 1 - progress;
    ctx.save();
    ctx.fillStyle = `rgba(10,7,5,${alpha})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
