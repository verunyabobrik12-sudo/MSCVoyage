const { launch, URL, OUT } = require('./pw.cjs');
require('fs').mkdirSync(OUT, { recursive: true });
const [,, W = '1082', H = '700', tag = 'desk', dpr = '1'] = process.argv;
const out = [];
const check = (n, ok, info = '') => out.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${info}`);
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: +dpr });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(URL);
  await p.getByRole('button', { name: 'Играть', exact: true }).click();
  for (let k = 0; k < 6; k++) { if (await p.evaluate(() => !!window.__game?.scene?.game && !document.querySelector('.msc-onboarding'))) break; await p.waitForTimeout(500); const s = p.getByRole('button', { name: 'Пропустить', exact: true }); if (await s.count()) await s.first().click().catch(() => {}); }
  await p.waitForTimeout(500);
  // 1) пустой альбом через кнопку HUD
  await p.getByRole('button', { name: /Открытки/ }).first().click();
  await p.waitForSelector('.msc-postcards-grid');
  await p.waitForTimeout(500);
  const locked = await p.evaluate(() => ({ locked: document.querySelectorAll('.msc-postcard.is-locked').length, counter: document.querySelector('.msc-postcards-counter').textContent, blocked: window.__game.scene.blocked }));
  check('пустой альбом: 5 закрытых', locked.locked === 5, JSON.stringify(locked));
  await p.screenshot({ path: `${OUT}/pc_empty_${tag}.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  check('после закрытия альбома мир не на паузе', !(await p.evaluate(() => window.__game.scene.blocked)));
  // 2) 4 из 5 пройдено, последняя — раннер
  await p.evaluate(() => {
    const S = window.__game.Storage;
    S.set({ completedQuizzes: { msc: true, rome: true }, completedMinigames: { catchFoodMinigame: { best: 80, playedOnce: true }, ballMinigame: { best: 90, playedOnce: true } },
      postcards: { cabin: true, rome: true, restaurant: true, pool: true }, points: 290, finaleSeen: false });
    const s = window.__game.scene; s.game.onHotspotPlay({ id: 'coinsMinigame', type: 'minigame' }, s.data.id);
  });
  await p.locator('.msc-minigame-cta button, .msc-minigame-cta').first().click();
  await p.waitForFunction(() => window.__minigame?._state);
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const st = window.__minigame._state; st.lives = 1; st.coinsTaken = 5; st.obstacles.push({ name: 'suitcase', x: 60, w: 40, h: 60 }); });
  await p.waitForSelector('.msc-minigame-result', { timeout: 10000 });
  await p.waitForTimeout(1500);
  await p.getByRole('button', { name: 'Вернуться', exact: true }).click();
  const finaleShown = await p.waitForSelector('.msc-finale-stage', { timeout: 5000 }).then(() => true).catch(() => false);
  check('финал открылся сам после последнего задания', finaleShown);
  await p.waitForTimeout(900);
  const fin = await p.evaluate(() => {
    const st = document.querySelector('.msc-finale-stage');
    const tel = document.querySelector('.msc-finale-contacts__row');
    return { rank: document.querySelector('.msc-finale-stat__value')?.textContent, company: document.querySelector('.msc-finale-contacts__company')?.textContent,
      tel: tel?.getAttribute('href'), telTarget: tel?.getAttribute('target'), scroll: st.scrollHeight > st.clientHeight + 2, seen: window.__game.Storage.get().finaleSeen };
  });
  check('финал: звание/компания/телефон', fin.company === 'НеобхоДима Тревел' && fin.tel === 'tel:+375447884422' && !fin.telTarget, JSON.stringify(fin));
  await p.screenshot({ path: `${OUT}/finale_${tag}.png` });
  // 3) из финала — в альбом, всё собрано, крупная открытка, кнопка «Итоги»
  await p.getByRole('button', { name: 'Открытки', exact: true }).last().click();
  await p.waitForSelector('.msc-postcards-grid');
  await p.waitForTimeout(500);
  const full = await p.evaluate(() => ({ owned: document.querySelectorAll('.msc-postcard.is-owned').length, finaleBtn: !!document.querySelector('.msc-postcards-finale-btn') }));
  check('полный альбом: 5 из 5 и кнопка «Итоги»', full.owned === 5 && full.finaleBtn, JSON.stringify(full));
  await p.screenshot({ path: `${OUT}/pc_full_${tag}.png` });
  await p.locator('button.msc-postcard').nth(4).click();
  await p.waitForSelector('.msc-postcard-big');
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/pc_big_${tag}.png` });
  // финал второй раз сам не всплывает
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.evaluate(() => { const s = window.__game.scene; s.game.onHotspotPlay({ id: 'catchFoodMinigame', type: 'minigame' }, s.data.id); });
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  check('финал не показывается повторно сам', !(await p.evaluate(() => !!document.querySelector('.msc-finale-stage'))));
  check('ошибок JS нет', errors.length === 0, JSON.stringify(errors));
  console.log(tag + '\n' + out.join('\n'));
  await b.close();
})().catch((e) => { console.log(out.join('\n')); console.error('FAIL', e.message); process.exit(1); });
