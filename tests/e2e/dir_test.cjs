const { launch, URL, OUT } = require('./pw.cjs');
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1082, height: 700 } });
  await p.goto(URL);
  await p.getByRole('button', { name: 'Играть', exact: true }).click();
  for (let k = 0; k < 6; k++) { if (await p.evaluate(() => !!window.__game?.scene?.game)) break; await p.waitForTimeout(500); const s = p.getByRole('button', { name: 'Пропустить', exact: true }); if (await s.count()) await s.first().click().catch(() => {}); }
  await p.evaluate(() => window.__game.scene.game.onSceneDoor({ target: 'corridor' }));
  await p.waitForFunction(() => window.__game.scene.data.id === 'corridor');
  await p.waitForTimeout(500);
  const run = async (name, from, to) => {
    const log = await p.evaluate(async ([from, to]) => {
      document.querySelectorAll('.msc-modal-backdrop--dock button').forEach((b) => b.innerText.includes('Нет') && b.click()); const s = window.__game.scene; s.blocked = false; s.player.x = from[0]; s.player.y = from[1]; s.player.path = null;
      s.player.moveTo(to[0], to[1], s.grid);
      const out = []; const t0 = performance.now();
      while (performance.now() - t0 < 5000 && s.player.path) {
        await new Promise((r) => requestAnimationFrame(r));
        out.push(s.player.dir);
      }
      return { path: (s.player.path || []).length, seq: out };
    }, [from, to]);
    // схлопываем подряд идущие одинаковые
    const runs = []; for (const d of log.seq) { if (!runs.length || runs[runs.length - 1][0] !== d) runs.push([d, 1]); else runs[runs.length - 1][1]++; }
    console.log(name, 'frames', log.seq.length, 'switches', runs.length - 1, JSON.stringify(runs.slice(0, 30)));
  };
  await run('horiz-right', [250, 700], [600, 700]);
  await run('horiz-left', [600, 700], [250, 700]);
  await run('diag 45', [250, 400], [550, 700]);
  await run('diag shallow', [250, 500], [560, 650]);
  await run('diag steep', [300, 400], [450, 900]);
  await run('diag up-left', [560, 1000], [260, 600]);
  await run('steep up', [450, 1000], [380, 450]);
  await b.close();
})();
