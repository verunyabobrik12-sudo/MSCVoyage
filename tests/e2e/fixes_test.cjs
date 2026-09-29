// Проверка правок 2026-09-25: титул, коридор (упор в двери), вход в ресторан,
// направление героини, подсказка кафе в Риме + её появление по центру,
// «Вернуться» без разрыва слова, мини-игра (статичная героиня, поимка).
const { launch, URL, OUT } = require('./pw.cjs');
require('fs').mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, info = '') => { results.push(`${ok ? 'OK  ' : 'FAIL'} ${name} ${info}`); };

(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1082, height: 607 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/t_title.png` });
  const bg = await p.evaluate(() => getComputedStyle(document.querySelector('.msc-title-screen')).backgroundImage);
  check('титул: фон-картинка', bg.includes('title_bg.jpg'), bg.slice(0, 60));

  await p.getByRole('button', { name: 'Играть', exact: true }).click();
  for (let k = 0; k < 6; k++) {
    if (await p.evaluate(() => !!window.__game?.scene?.game && !document.querySelector('.msc-onboarding'))) break;
    await p.waitForTimeout(500);
    const s = p.getByRole('button', { name: 'Пропустить', exact: true });
    if (await s.count()) await s.first().click().catch(() => {});
  }
  await p.waitForFunction(() => window.__game?.scene?.game);
  const G = 'window.__game.scene';
  const modalOpen = () => p.evaluate(() => !!document.querySelector('.msc-modal-backdrop--dock'));
  const go = async (target) => {
    await p.evaluate((t) => window.__game.scene.game.onSceneDoor({ target: t }), target);
    await p.waitForFunction((t) => window.__game.scene.data.id === t, target);
  };

  // --- коридор: упор в дверь ресторана справа ---------------------------------
  await go('corridor');
  await p.waitForTimeout(2200);
  check('коридор: нет окна сразу при входе', !(await modalOpen()));
  await p.evaluate(() => { const s = window.__game.scene; s.player.x = 500; s.player.y = 600; s.dismissedIds.clear(); });
  // тянем вправо к двери ресторана клавиатурой, пишем направление каждые 60 мс
  await p.keyboard.down('ArrowRight');
  const dirs = [];
  for (let i = 0; i < 20; i++) { dirs.push(await p.evaluate(() => window.__game.scene.player.dir)); await p.waitForTimeout(60); }
  await p.screenshot({ path: `${OUT}/t_walk_right.png` });
  await p.waitForTimeout(1500);
  await p.keyboard.up('ArrowRight');
  const px = await p.evaluate(() => window.__game.scene.player.x);
  check('направление при ходьбе вправо всё время right', dirs.every((d) => d === 'right'), JSON.stringify([...new Set(dirs)]));
  check('коридор: упор в стену (x ≤ 675)', px <= 675, `x=${px.toFixed(0)}`);
  await p.screenshot({ path: `${OUT}/t_corridor_wall.png` });
  // идём к двери ресторана — должно спросить
  await p.evaluate(() => { const s = window.__game.scene; s.player.moveTo(650, 800, s.grid); });
  await p.waitForTimeout(2500);
  check('коридор: у двери ресторана спрашивает', await modalOpen());
  await p.screenshot({ path: `${OUT}/t_corridor_door.png` });

  // --- ресторан: вход без мгновенного «Выйти?» --------------------------------
  await p.evaluate(() => document.querySelector('.msc-modal-backdrop--dock button')?.click());
  await go('restaurant');
  await p.waitForTimeout(3000);
  check('ресторан: стоя в дверях 3 с, окна нет', !(await modalOpen()));
  await p.screenshot({ path: `${OUT}/t_restaurant_enter.png` });
  // отошла и вернулась — должно спросить
  await p.evaluate(() => { const s = window.__game.scene; s.player.moveTo(425, 950, s.grid); });
  await p.waitForTimeout(2000);
  await p.evaluate(() => { const s = window.__game.scene; s.player.moveTo(425, 1125, s.grid); });
  await p.waitForTimeout(2500);
  check('ресторан: после возврата к двери спрашивает', await modalOpen());
  await p.evaluate(() => [...document.querySelectorAll('.msc-modal-backdrop--dock button')].find((x) => x.innerText.includes('Нет'))?.click());

  // --- Рим: подсказка кафе, появление по центру -------------------------------
  await go('rome');
  await p.waitForTimeout(1600);
  await p.evaluate(() => { const s = window.__game.scene; s.player.moveTo(600, 735, s.grid); });
  const frames = [];
  for (let i = 0; i < 60; i++) {
    const r = await p.evaluate(() => {
      const bub = document.querySelector('.msc-info-bubble');
      const fr = document.querySelector('#phone-frame').getBoundingClientRect();
      if (!bub) return null;
      const r = bub.getBoundingClientRect();
      return { dx: Math.round((r.left + r.right) / 2 - (fr.left + fr.right) / 2), text: bub.innerText.slice(0, 30) };
    });
    if (r) frames.push(r);
    if (frames.length >= 6) break;
    await p.waitForTimeout(r ? 40 : 120);
  }
  await p.screenshot({ path: `${OUT}/t_rome_cafe.png` });
  check('Рим: подсказка кафе всплыла', frames.length > 0, frames[0] ? frames[0].text : '');
  check('Рим: подсказка по центру всё время появления', frames.length > 0 && frames.every((f) => Math.abs(f.dx) <= 2), JSON.stringify(frames.map((f) => f.dx)));

  // --- мини-игра: результат и «Вернуться» ------------------------------------
  await p.waitForTimeout(4500);
  await go('restaurant');
  await p.evaluate(() => { const s = window.__game.scene; s.game.onHotspotPlay({ id: 'catchFoodMinigame', type: 'minigame' }, s.data.id); });
  await p.locator('.msc-minigame-cta button, .msc-minigame-cta').first().click();
  await p.waitForSelector('.msc-minigame-field canvas');
  await p.waitForFunction(() => window.__minigame?._state && window.__minigame._state.items.length > 0, null, { timeout: 8000 });
  // ставим героиню ровно под предмет и ждём, что он будет пойман (итальянский или нет — неважно)
  const caughtTest = await p.evaluate(async () => {
    const st = window.__minigame._state;
    const it = st.items[0];
    st.lives = 99; // чтобы чужая кухня не закончила раунд
    const before = st.caught + (99 - st.lives);
    const start = performance.now();
    while (performance.now() - start < 4000) {
      st.heroX = it.x; st.targetX = it.x;
      await new Promise((r) => setTimeout(r, 30));
      if (!st.items.includes(it)) break;
    }
    return { gone: !st.items.includes(it), caughtDelta: st.caught + (99 - st.lives) - before, missed: st.missed };
  });
  check('мини-игра: предмет над героиней пойман', caughtTest.gone && caughtTest.caughtDelta >= 1, JSON.stringify(caughtTest));
  await p.screenshot({ path: `${OUT}/t_catch.png` });
  await p.evaluate(() => { window.__minigame._state.lives = 1; });
  // доводим до конца: подставляем чужую еду
  await p.evaluate(() => { const st = window.__minigame._state; st.items.push({ name: 'sushi_asian', foreign: true, x: st.heroX, y: 0, speed: 3, rot: 0, spin: 0 }); });
  await p.waitForSelector('.msc-minigame-result', { timeout: 8000 });
  await p.waitForTimeout(800);
  const labels = await p.evaluate(() => [...document.querySelectorAll('.msc-minigame-result .msc-btn__label')].map((l) => {
    const r = l.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(l).lineHeight) || parseFloat(getComputedStyle(l).fontSize) * 1.3;
    return { t: l.innerText, lines: Math.round(r.height / lh), fits: l.scrollWidth <= l.parentElement.clientWidth };
  }));
  check('результат: подписи кнопок в одну строку и влезают', labels.every((l) => l.lines === 1 && l.fits), JSON.stringify(labels));
  await p.screenshot({ path: `${OUT}/t_result.png` });

  check('ошибок JS нет', errors.length === 0, JSON.stringify(errors));
  console.log(results.join('\n'));
  await b.close();
})().catch((e) => { console.log(results.join('\n')); console.error('FAIL', e.message); process.exit(1); });
