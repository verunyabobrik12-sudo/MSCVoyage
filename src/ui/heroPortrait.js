// Общий кроп "портрета" героини из спрайт-листа ходьбы (кадр "вниз", крупным
// планом) — используется в HUD и в обучении. Без transform: percent-based
// translate сдвигает на долю ширины ВСЕГО листа, а не одного кадра, и тут же
// уводит картинку на соседний кадр — весь сдвиг считаем сразу в left/top.

// Глаза в кадре "вниз" измерены вручную по сетке (см. память сессии) —
// центр лица (уровень глаз) лежит на ~33% высоты кадра 146x308, у шляпы
// сверху и подбородка снизу. Старая формула (0.06 от высоты) центрировала
// окно портрета почти на полях шляпы, а не на лице.
const FACE_CENTER_FRACTION = 0.33;

/**
 * @param {{sheetSrc:string, frameWidth:number, frameHeight:number, sheetWidth:number, sheetHeight:number, frameX:number, frameY:number}} heroPortrait
 * @param {number} size сторона круглого контейнера-портрета, CSS px
 * @param {number} zoom во сколько раз кадр шире контейнера (крупный план лица, не кадр целиком)
 */
export function buildPortraitImg(heroPortrait, size, zoom = 2.2) {
  const img = document.createElement('img');
  img.src = heroPortrait.sheetSrc;
  img.alt = '';
  const scale = (size * zoom) / heroPortrait.frameWidth;
  const frameDrawW = heroPortrait.frameWidth * scale;
  const windowHeightSource = heroPortrait.frameWidth / zoom; // сколько исходных px видно по вертикали
  const faceCenterSource = heroPortrait.frameY + heroPortrait.frameHeight * FACE_CENTER_FRACTION;
  const windowTopSource = faceCenterSource - windowHeightSource / 2;
  img.style.position = 'absolute';
  img.style.maxWidth = 'none';
  img.style.width = `${heroPortrait.sheetWidth * scale}px`;
  img.style.left = `${-heroPortrait.frameX * scale + (size - frameDrawW) / 2}px`;
  img.style.top = `${-windowTopSource * scale}px`;
  return img;
}
