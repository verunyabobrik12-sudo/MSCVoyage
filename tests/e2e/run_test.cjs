const { launch, URL, OUT } = require('./pw.cjs');
require('fs').mkdirSync(OUT, { recursive: true });
const [,, W = '1082', H = '700', tag = 'desk', mode = 'bot'] = process.argv;
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 2 });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(URL);
  await p.getByRole('button', { name: 'Играть', exact: true }).click();
  for (let k = 0; k < 6; k++) { if (await p.evaluate(() => !!window.__game?.scene?.game)) break; await p.waitForTimeout(500); const s = p.getByRole('button', { name: 'Пропустить', exact: true }); if (await s.count()) await s.first().click().catch(() => {}); }
  await p.evaluate(() => { const s = window.__game.scene; s.game.onHotspotPlay({ id: 'coinsMinigame', type: 'minigame' }, s.data.id); });
  await p.waitForSelector('.msc-minigame-cta');
  await p.screenshot({ path: `${OUT}/run_intro_${tag}.png` });
  await p.locator('.msc-minigame-cta button, .msc-minigame-cta').first().click();
  await p.waitForSelector('.msc-minigame-field canvas');
  await p.waitForFunction(() => window.__minigame?._state);
  if (mode === 'bot') {
    // бот прыгает пробелом (тот же путь, что у игрока), когда препятствие близко
    await p.evaluate(() => {
      window.__bot = setInterval(() => {
        const g = window.__minigame; if (!g) { clearInterval(window.__bot); return; }
        const st = g._state; const L = g._layout();
        const v = (0.5 + 0.35 * st.progress) * document.querySelector('.msc-minigame-canvas').clientWidth; const near = st.obstacles.find((o) => !o.hit && o.x + o.w / 2 > L.heroX && o.x + o.w / 2 - L.heroX < v * 0.42);
        if (near && st.heroY === 0) window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      }, 20);
    });
  }
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/run_early_${tag}.png` });
  await p.waitForTimeout(10000);
  await p.screenshot({ path: `${OUT}/run_mid_${tag}.png` });
  const mid = await p.evaluate(() => { const st = window.__minigame?._state; return st && { coins: st.coinsTaken, missed: st.coinsMissed, lives: st.lives, obst: st.obstacles.length }; });
  console.log('через ~12 с:', JSON.stringify(mid));
  // ждём фонтан
  const gotFountain = await p.waitForFunction(() => window.__minigame?._state?.fountain && window.__minigame._state.fountain.x < document.querySelector('.msc-minigame-canvas').clientWidth * 0.8, null, { timeout: 45000 }).then(() => true).catch(() => false);
  if (gotFountain) { await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/run_fountain_${tag}.png` }); }
  const fin = await p.evaluate(async () => { let last = null; while (window.__minigame) { const st = window.__minigame._state; last = { coins: st.coinsTaken, missed: st.coinsMissed, lives: st.lives, p: +st.progress.toFixed(2), result: window.__minigame.resultScore() }; await new Promise((r) => setTimeout(r, 150)); } return last; });
  console.log('фонтан показан:', gotFountain, 'итог:', JSON.stringify(fin));
  await p.waitForSelector('.msc-minigame-result', { timeout: 10000 });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/run_result_${tag}.png` });
  console.log('ошибки:', JSON.stringify(errors));
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
