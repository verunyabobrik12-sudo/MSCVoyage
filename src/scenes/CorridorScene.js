// Локация "Коридор лайнера" — хаб между каютой и остальными локациями.
// На этом этапе (3) реализована только дверь обратно в каюту; двери в ресторан,
// бассейн, Рим и стойку "Экскурсионное бюро" добавляются на этапе 4-5.

import { RoomScene } from '../engine/roomScene.js';
import { TileMap } from '../engine/tilemap.js';
import { Assets } from '../art/assets.js';
import { STRINGS } from '../data/strings.ru.js';
import { PALETTE } from '../art/palette.js';

const COLS = 24;
const ROWS = 8;

function buildTileMap() {
  const map = new TileMap(COLS, ROWS);
  map.setSolidRect(0, 0, COLS, 1);
  map.setSolidRect(0, 0, 1, ROWS);
  map.setSolidRect(COLS - 1, 0, 1, ROWS);
  map.setSolidRect(0, ROWS - 1, COLS, 1);
  // Дверь обратно в каюту — слева
  map.setSolid(2, 0, 0);
  map.setSolid(2, ROWS - 1, 0);
  return map;
}

export class CorridorScene extends RoomScene {
  constructor(game) {
    const tileMap = buildTileMap();
    super({
      game,
      tileMap,
      spawnX: 4 * 16,
      spawnY: 4 * 16,
      locationLabel: STRINGS.locations.corridor,
      doors: [
        {
          id: 'toCabin',
          x: 1 * 16, y: 2 * 16, w: 3 * 16, h: 4 * 16,
          signX: 2 * 16, signY: 2 * 16,
          label: STRINGS.locations.cabin,
          target: 'cabin',
        },
      ],
      hotspots: [],
    });
  }

  onDoorEnter(target) {
    if (target === 'cabin') {
      import('./CabinScene.js').then(({ CabinScene }) => {
        this.game.sceneManager.goto(new CabinScene(this.game));
      });
    }
  }

  drawDecor(ctx, camera, time) {
    const worldW = COLS * 16;
    const worldH = ROWS * 16;
    Assets.drawFloorWood(ctx, camera.toScreen(16, 16).x, camera.toScreen(16, 16).y, worldW - 32, worldH - 32);
    Assets.drawRug(ctx, camera.toScreen(16, worldH / 2 - 8).x, camera.toScreen(16, worldH / 2 - 8).y, worldW - 32, 16, PALETTE.carpetRed);
    Assets.drawWall(ctx, camera.toScreen(0, 0).x, camera.toScreen(0, 0).y, worldW, 16, PALETTE.wallBlue);

    const doorScreen = camera.toScreen(1 * 16, 2 * 16);
    Assets.drawDoorFrame(ctx, doorScreen.x, doorScreen.y, 3 * 16, 4 * 16, STRINGS.locations.cabin);

    // Заглушки будущих дверей — просто подписи на стене, без коллизий и переходов.
    ctx.save();
    ctx.globalAlpha = 0.5;
    const labels = ['Ресторан', 'Бассейн', 'Рим →'];
    labels.forEach((label, i) => {
      const pos = camera.toScreen(10 * 16 + i * 4 * 16, 2 * 16);
      Assets.drawDoorFrame(ctx, pos.x, pos.y, 2 * 16, 4 * 16, label);
    });
    ctx.restore();
  }
}
