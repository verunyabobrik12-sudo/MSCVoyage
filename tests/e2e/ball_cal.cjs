const { launch, URL, OUT } = require('./pw.cjs');
require('fs').mkdirSync(OUT, { recursive: true });
const [,, W = '390', H = '844', tag = 'phone'] = process.argv;
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 2 });
  await p.goto(URL);
  await p.getByRole('button', { name: 'Играть', exact: true }).click();
  for (let k = 0; k < 6; k++) { if (await p.evaluate(() => !!window.__game?.scene?.game && !document.querySelector('.msc-onboarding'))) break; await p.waitForTimeout(500); const s = p.getByRole('button', { name: 'Пропустить', exact: true }); if (await s.count()) await s.first().click().catch(() => {}); }
  await p.evaluate(() => { const s = window.__game.scene; s.game.onHotspotPlay({ id: 'ballMinigame', type: 'minigame' }, s.data.id); });
  await p.locator('.msc-minigame-cta button, .msc-minigame-cta').first().click();
  await p.waitForSelector('.msc-minigame-field canvas');
  await p.waitForFunction(() => window.__minigame?._state?.ball);
  // бот: под мяч; если к ракетке близко ловушка — смещается от неё
  await p.evaluate(() => {
    window.__bot = setInterval(() => {
      const g = window.__minigame; if (!g) { clearInterval(window.__bot); return; }
      const st = g._state; const geo = g._geom(); const c = document.querySelector('.msc-minigame-canvas');
      const w = c.clientWidth;
      let tx = st.ball ? st.ball.x : w / 2;
      for (const it of st.items) {
        if (!it.trap) continue;
        if (it.y > geo.top - geo.w * 0.9 && Math.abs(it.x - tx) < geo.w / 2 + it.r + 6) tx = it.x + (tx >= it.x ? 1 : -1) * (geo.w / 2 + it.r + 10);
      }
      const r = c.getBoundingClientRect();
      document.querySelector('.msc-minigame-field').dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: r.left + Math.max(0, Math.min(w, tx)), clientY: r.top + 10, bubbles: true }));
    }, 25);
  });
  await p.waitForTimeout(8000);
  await p.screenshot({ path: OUT + '/ball_mid_' + tag + '.png' });
  await p.screenshot({ path: `${OUT}/ball_mid_${tag}.png` });
  const fin = await p.evaluate(async () => {
    let last = null;
    while (window.__minigame) { const st = window.__minigame._state; last = { score: st.score, hits: st.hits, lives: st.lives, p: +st.progress.toFixed(2), result: window.__minigame.resultScore() }; await new Promise((r) => setTimeout(r, 200)); }
    return last;
  });
  console.log(tag, 'итог:', JSON.stringify(fin));
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
