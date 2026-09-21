// Камера следует за целью и не выходит за границы карты локации.

export class Camera {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.x = 0;
    this.y = 0;
  }

  follow(targetX, targetY, mapW, mapH) {
    // Если локация меньше экрана по какой-то оси — центрируем её на этой оси,
    // а не прижимаем к левому/верхнему краю (иначе вокруг маленькой комнаты
    // остаётся пустота только с одной стороны).
    const x = mapW <= this.screenW
      ? (mapW - this.screenW) / 2
      : Math.max(0, Math.min(targetX - this.screenW / 2, mapW - this.screenW));
    const y = mapH <= this.screenH
      ? (mapH - this.screenH) / 2
      : Math.max(0, Math.min(targetY - this.screenH / 2, mapH - this.screenH));
    this.x = Math.round(x);
    this.y = Math.round(y);
  }

  toScreen(x, y) {
    return { x: x - this.x, y: y - this.y };
  }

  toWorld(x, y) {
    return { x: x + this.x, y: y + this.y };
  }
}
