// Единая точка ввода: клавиатура (стрелки/WASD/Enter/Пробел/Esc) + указатель
// (тап/клик, координаты сразу переводятся в логические пиксели канваса).

export class Input {
  constructor(canvas, toLogicalCoords) {
    this.canvas = canvas;
    this.toLogicalCoords = toLogicalCoords;
    this.keys = new Set();
    this.keysPressed = new Set(); // клавиши, нажатые именно в этом кадре

    this.pointerDown = false;
    this.pointerTap = null; // {x, y} — разовое событие тапа, разбирается сценой и очищается
    this.onFirstGesture = null; // колбэк один раз при первом жесте (для разблокировки звука)
    this._firstGestureFired = false;

    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this._onKeyUp(e));

    canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _fireFirstGesture() {
    if (!this._firstGestureFired) {
      this._firstGestureFired = true;
      this.onFirstGesture?.();
    }
  }

  _onKeyDown(e) {
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape'].includes(code)) {
      e.preventDefault();
    }
    if (!this.keys.has(code)) this.keysPressed.add(code);
    this.keys.add(code);
    this._fireFirstGesture();
  }

  _onKeyUp(e) {
    this.keys.delete(e.code);
  }

  _onPointerDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const logical = this.toLogicalCoords(cssX, cssY, rect);
    if (logical) {
      this.pointerTap = logical;
    }
    this._fireFirstGesture();
  }

  /** Забрать тап (однократно) — вызывать раз в кадр из активной сцены. */
  consumeTap() {
    const tap = this.pointerTap;
    this.pointerTap = null;
    return tap;
  }

  /** Забрать клавишу, нажатую именно в этом кадре (для меню, диалогов). */
  consumeKeyPress(code) {
    if (this.keysPressed.has(code)) {
      this.keysPressed.delete(code);
      return true;
    }
    return false;
  }

  /** Направление движения по удерживаемым клавишам: {x, y} в диапазоне [-1, 1]. */
  getMoveAxis() {
    let x = 0;
    let y = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) x -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) x += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) y -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) y += 1;
    return { x, y };
  }

  isConfirmPressed() {
    return this.consumeKeyPress('Enter') || this.consumeKeyPress('Space');
  }

  isCancelPressed() {
    return this.consumeKeyPress('Escape');
  }

  /** Вызывать в конце каждого кадра, чтобы очистить одноразовые события. */
  endFrame() {
    this.keysPressed.clear();
  }
}
