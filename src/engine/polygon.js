// Геометрия сцены: точка-в-полигоне, точка-в-круге, точка-в-триггере.
// Всё работает в координатах сцены (системе исходной картинки), не экрана.

/** Точка внутри многоугольника (ray casting). points — [[x,y], ...]. */
export function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0], yi = points[i][1];
    const xj = points[j][0], yj = points[j][1];
    const intersect = (yi > py) !== (yj > py)
      && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInCircle(px, py, cx, cy, r) {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

/** blocker: {polygon:[[x,y],...]} или {circle:[cx,cy,r]}. */
export function pointInBlocker(px, py, blocker) {
  if (blocker.circle) return pointInCircle(px, py, blocker.circle[0], blocker.circle[1], blocker.circle[2]);
  if (blocker.polygon) return pointInPolygon(px, py, blocker.polygon);
  return false;
}

/** trigger: {shape:'rect',x,y,w,h} или {shape:'circle',x,y,r}. */
export function pointInTrigger(px, py, trigger) {
  if (trigger.shape === 'circle') return pointInCircle(px, py, trigger.x, trigger.y, trigger.r);
  return px >= trigger.x && px <= trigger.x + trigger.w && py >= trigger.y && py <= trigger.y + trigger.h;
}

/** Ограничивающий прямоугольник полигона/блокера — для быстрых грубых проверок. */
export function boundingBox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}
