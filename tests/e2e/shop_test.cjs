const { launch, URL, OUT } = require('./pw.cjs');
require('fs').mkdirSync(OUT, { recursive: true });
const [,, W = '1082', H = '700', tag = 'desk', dpr = '1'] = process.argv;
const out = []; const check = (n, ok, info = '') => out.push(`${ok ? 'OK  ' : 'FAIL'} ${n} ${info}`);
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: +dpr });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(URL);
  await p.getByRole('button', { name: 'Играть', exact: true }).click();
  for (let k = 0; k < 6; k++) { if (await p.evaluate(() => !!window.__game?.scene?.game)) break; await p.waitForTimeout(500); const s = p.getByRole('button', { name: 'Пропустить', exact: true }); if (await s.count()) await s.first().click().catch(() => {}); }
  await p.evaluate(() => { window.__game.Storage.set({ points: 100, purchasedExcursions: {} }); window.__game.hud.setPoints(100); });
  await p.getByRole('button', { name: /Магазин/ }).first().click();
  await p.waitForSelector('.msc-shop-card');
  await p.waitForTimeout(500);
  const s1 = await p.evaluate(() => ({ cards: document.querySelectorAll('.msc-shop-card').length, buy: document.querySelectorAll('.msc-shop-footer button').length, lack: [...document.querySelectorAll('.msc-shop-lack')].map((x) => x.textContent) }));
  check('магазин: 4 экскурсии, 3 доступны, на 1 не хватает 20', s1.cards === 4 && s1.buy === 3 && s1.lack[0] === 'Не хватает 20', JSON.stringify(s1));
  await p.screenshot({ path: `${OUT}/shop_${tag}.png` });
  await p.locator('.msc-shop-card').first().getByRole('button', { name: 'Купить' }).click();
  await p.waitForTimeout(500);
  const s2 = await p.evaluate(() => ({ points: window.__game.Storage.get().points, bought: Object.keys(window.__game.Storage.get().purchasedExcursions), ribbon: document.querySelectorAll('.msc-ribbon-purchased').length,
    balance: document.querySelector('.msc-shop-balance').textContent, badge: document.querySelector('.msc-points-badge').textContent }));
  check('покупка: 50 баллов списано, лента, баланс и HUD обновились', s2.points === 50 && s2.bought[0] === 'oldrome' && s2.ribbon === 1 && s2.balance.includes('50') && s2.badge.includes('50'), JSON.stringify(s2));
  await p.screenshot({ path: `${OUT}/shop_bought_${tag}.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  check('после закрытия мир не на паузе', !(await p.evaluate(() => window.__game.scene.blocked)));
  await p.locator('.msc-points-badge').click();
  const viaBadge = await p.waitForSelector('.msc-shop-card', { timeout: 3000 }).then(() => true).catch(() => false);
  check('табличка баллов тоже открывает магазин', viaBadge);
  check('ошибок JS нет', errors.length === 0, JSON.stringify(errors));
  console.log(tag + '\n' + out.join('\n'));
  await b.close();
})().catch((e) => { console.log(out.join('\n')); console.error('FAIL', e.message); process.exit(1); });
