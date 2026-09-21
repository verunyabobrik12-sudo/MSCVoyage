// Локация "Каюта" — стартовая комната. Кровать, тумбочка, шкаф, стол с буклетом
// MSC (викторина), иллюминатор с видом на море, дверь в коридор.

import { RoomScene } from '../engine/roomScene.js';
import { TileMap } from '../engine/tilemap.js';
import { Assets } from '../art/assets.js';
import { STRINGS } from '../data/strings.ru.js';
import { QUIZZES } from '../data/quizzes.js';
import { QuizScene } from '../quiz/QuizScene.js';
import { Storage } from '../engine/storage.js';
import { PALETTE } from '../art/palette.js';

const COLS = 15;
const ROWS = 18;

function buildTileMap() {
  const map = new TileMap(COLS, ROWS);
  map.setSolidRect(0, 0, COLS, 1); // верхняя стена
  map.setSolidRect(0, 0, 1, ROWS); // левая стена
  map.setSolidRect(COLS - 1, 0, 1, ROWS); // правая стена
  map.setSolidRect(0, ROWS - 1, COLS, 1); // нижняя стена
  map.setSolid(6, ROWS - 1, 0); // дверной проём
  map.setSolid(7, ROWS - 1, 0);
  map.setSolid(8, ROWS - 1, 0);

  map.setSolidRect(1, 1, 3, 4); // кровать
  map.setSolid(4, 1); // тумбочка
  map.setSolidRect(11, 1, 2, 3); // шкаф
  map.setSolidRect(10, 12, 3, 2); // стол
  return map;
}

export class CabinScene extends RoomScene {
  constructor(game) {
    const tileMap = buildTileMap();
    super({
      game,
      tileMap,
      spawnX: 7 * 16 + 8,
      spawnY: 9 * 16 + 8,
      locationLabel: STRINGS.locations.cabin,
      doors: [
        {
          id: 'toCorridor',
          x: 6 * 16, y: 14 * 16, w: 3 * 16, h: 4 * 16,
          signX: 7.5 * 16, signY: 12 * 16,
          label: STRINGS.locations.corridor,
          target: 'corridor',
        },
      ],
      hotspots: [
        {
          id: 'mscQuiz',
          kind: 'quiz',
          x: 154, y: 175, w: 32, h: 32,
          // Точка подхода — над столом (сам стол solid, поэтому нельзя подойти
          // вплотную снизу); должна быть внутри APPROACH_RADIUS от центра хотспота.
          approachX: 170, approachY: 178,
          title: STRINGS.locations.cabin,
          description: 'Пройти викторину «Всё о MSC Cruises»?',
          isCompleted: () => Storage.isQuizCompleted('msc'),
          onPlay: () => this._startQuiz(),
        },
      ],
    });
  }

  onDoorEnter(target) {
    if (target === 'corridor') {
      import('./CorridorScene.js').then(({ CorridorScene }) => {
        this.game.sceneManager.goto(new CorridorScene(this.game));
      });
    }
  }

  _startQuiz() {
    const quiz = QUIZZES.msc;
    const scene = new QuizScene({
      quiz,
      postcardId: 'cabin',
      onFinish: () => this.game.sceneManager.goto(this),
    });
    this.game.sceneManager.goto(scene);
  }

  drawDecor(ctx, camera, time) {
    // Комната рисуется в мировых координатах, поэтому все точки переводим в
    // экранные через камеру — иначе при центрировании маленькой локации на
    // большом экране декор "отклеится" от игрока/дверей/хотспотов.
    const o = camera.toScreen(0, 0);

    Assets.drawFloorWood(ctx, o.x, o.y + 16, COLS * 16, (ROWS - 2) * 16);
    Assets.drawWall(ctx, o.x, o.y, COLS * 16, 16, PALETTE.wallCream);

    // Иллюминатор на правой стене
    Assets.drawPorthole(ctx, o.x + COLS * 16 - 24, o.y + 3 * 16 + 8, 14, time);

    Assets.drawBed(ctx, o.x + 1 * 16, o.y + 1 * 16 + 4);
    Assets.drawNightstand(ctx, o.x + 4 * 16, o.y + 1 * 16 + 24);
    Assets.drawWardrobe(ctx, o.x + 11 * 16, o.y + 1 * 16);
    Assets.drawDesk(ctx, o.x + 10 * 16, o.y + 12 * 16);
    Assets.drawBrochure(ctx, o.x + 10 * 16 + 4, o.y + 12 * 16 - 6);

    // Дверной проём
    Assets.drawDoorFrame(ctx, o.x + 6 * 16, o.y + (ROWS - 2) * 16, 3 * 16, 2 * 16, STRINGS.locations.corridor);
  }
}
