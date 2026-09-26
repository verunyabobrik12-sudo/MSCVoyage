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
  await p.evaluate(() => window.__game.Storage.set({ completedQuizzes: { msc: true }, completedMinigames: {} }));
  await p.getByRole('button', { name: /Карта/ }).first().click();
  await p.waitForSelector('.msc-map-place');
  await p.waitForTimeout(600);
  const m = await p.evaluate(() => ({
    places: [...document.querySelectorAll('.msc-map-place__name')].map((n) => n.textContent),
    current: document.querySelector('.msc-map-place.is-current .msc-map-place__name')?.textContent,
    done: [...document.querySelectorAll('.msc-map-task.is-done')].map((n) => n.textContent),
    tasks: document.querySelectorAll('.msc-map-task').length,
    paused: window.__game.scene.blocked,
  }));
  check('карта: 5 мест, вы в каюте, мир на паузе', m.places.length === 5 && m.current === 'Каюта' && m.paused, JSON.stringify(m.places));
  check('карта: пройденная викторина отмечена, всего заданий 5', m.done.length === 1 && m.tasks === 5, JSON.stringify(m.done));
  await p.screenshot({ path: `${OUT}/map_${tag}.png` });
  await p.locator('.msc-map-place', { hasText: 'Рим' }).click();
  await p.waitForFunction(() => window.__game.scene.data.id === 'rome', null, { timeout: 8000 });
  await p.waitForTimeout(1500);
  const after = await p.evaluate(() => ({ id: window.__game.scene.data.id, paused: window.__game.scene.blocked, modal: !!document.querySelector('.msc-modal-backdrop') }));
  check('переход в Рим: сцена сменилась, мир не на паузе, окон нет', after.id === 'rome' && !after.paused && !after.modal, JSON.stringify(after));
  await p.screenshot({ path: `${OUT}/map_after_${tag}.png` });
  check('ошибок JS нет', errors.length === 0, JSON.stringify(errors));
  console.log(tag + '\n' + out.join('\n'));
  await b.close();
})().catch((e) => { console.log(out.join('\n')); console.error('FAIL', e.message); process.exit(1); });
