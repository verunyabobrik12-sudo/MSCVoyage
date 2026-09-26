// Сквозное прохождение с нуля, как игрок: героиня идёт к точке (moveTo),
// на «Сыграть?/Пройти?» жмём «Да», викторины проходим кликами, мини-игры
// доводим до конца (подкидываем препятствие при последней жизни). Переходы
// между локациями — только через двери. В конце ждём финал.
const { launch, URL, OUT } = require('./pw.cjs');
require('fs').mkdirSync(OUT, { recursive: true });
const [,, W = '1082', H = '700', tag = 'desk', dpr = '1'] = process.argv;
const log = [];
const step = (s) => { log.push(s); console.log(s); };

(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: +dpr });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(URL);
  await p.getByRole('button', { name: 'Играть', exact: true }).click();
  for (let k = 0; k < 6; k++) { if (await p.evaluate(() => !!window.__game?.scene?.game)) break; await p.waitForTimeout(500); const s = p.getByRole('button', { name: 'Пропустить', exact: true }); if (await s.count()) await s.first().click().catch(() => {}); }
  await p.waitForTimeout(600);

  const sceneId = () => p.evaluate(() => window.__game.scene.data.id);
  async function walkTo(x, y) {
    await p.evaluate(([x, y]) => { const s = window.__game.scene; s.player.moveTo(x, y, s.grid); }, [x, y]);
  }
  // идти к точке и дождаться окна «Да/Нет»; подсказки-облачка по пути закрываем тапом
  async function goAndConfirm(x, y, what) {
    await walkTo(x, y);
    for (let i = 0; i < 60; i++) {
      await p.waitForTimeout(150);
      const bubble = p.locator('.msc-info-bubble');
      if (await bubble.count()) { await bubble.first().click().catch(() => {}); await walkTo(x, y); }
      const yes = p.locator('.msc-modal-backdrop--dock button', { hasText: 'Да' });
      if (await yes.count()) {
        const text = await p.locator('.msc-modal-backdrop--dock').innerText();
        await yes.first().click();
        step(`  «${text.replace(/\s+/g, ' ').replace(/ Да Нет$/, '').trim()}» → Да (${what})`);
        return true;
      }
    }
    throw new Error(`не появилось окно у ${what} (${x},${y}) в сцене ${await sceneId()}`);
  }
  async function door(x, y, target) {
    await goAndConfirm(x, y, `дверь → ${target}`);
    await p.waitForFunction((t) => window.__game.scene.data.id === t, target, { timeout: 8000 });
    await p.waitForTimeout(1200);
    step(`[${target}]`);
  }
  async function quiz() {
    await p.waitForSelector('.msc-quiz-answer', { timeout: 8000 });
    for (let q = 0; q < 12; q++) {
      const ans = p.locator('.msc-quiz-answer');
      if (!(await ans.count())) break;
      await ans.first().click();
      const next = p.getByRole('button', { name: /^(Дальше|Итог)$/ });
      await next.waitFor({ timeout: 5000 });
      const label = await next.innerText();
      await next.click();
      if (label.includes('Итог')) break;
    }
    await p.waitForSelector('.msc-quiz-result', { timeout: 5000 });
    await p.waitForTimeout(1500);
    const res = (await p.locator('.msc-quiz-result').innerText()).replace(/\s+/g, ' ').slice(0, 90);
    step(`  викторина: ${res}`);
    await p.locator('.msc-quiz-result').getByRole('button', { name: 'Продолжить', exact: true }).click();
    await p.waitForTimeout(800);
  }
  async function minigame(hazard) {
    await p.locator('.msc-minigame-cta button, .msc-minigame-cta').first().click();
    await p.waitForFunction(() => window.__minigame?._state);
    await p.waitForTimeout(1500);
    await p.evaluate(hazard);
    await p.waitForSelector('.msc-minigame-result', { timeout: 10000 });
    await p.waitForTimeout(1500);
    const res = (await p.locator('.msc-minigame-result').innerText()).replace(/\s+/g, ' ').slice(0, 80);
    step(`  мини-игра: ${res}`);
    await p.getByRole('button', { name: 'Вернуться', exact: true }).click();
    await p.waitForTimeout(900);
  }
  const progress = () => p.evaluate(() => { const s = window.__game.Storage.get(); return `пройдено ${Object.keys(s.completedQuizzes).length + Object.keys(s.completedMinigames).length}/5, открыток ${Object.keys(s.postcards).length}, баллов ${s.points}`; });

  step(`[${await sceneId()}]`);
  await goAndConfirm(270, 1040, 'викторина в каюте'); await quiz();
  step('  ' + await progress());
  await door(430, 1120, 'corridor');
  await door(640, 800, 'restaurant');
  await goAndConfirm(430, 300, 'мини-игра ресторана');
  await minigame(() => { const st = window.__minigame._state; st.lives = 1; st.items.push({ name: 'sushi_asian', foreign: true, x: st.heroX, y: 0, speed: 4, rot: 0, spin: 0 }); });
  step('  ' + await progress());
  await door(425, 1030, 'corridor');
  await door(200, 950, 'pool');
  await goAndConfirm(620, 980, 'мини-игра бассейна');
  await minigame(() => { const st = window.__minigame._state; st.lives = 1; if (st.ball) { st.ball.y = 5000; } });
  step('  ' + await progress());
  await door(425, 1030, 'corridor');
  await door(375, 300, 'rome');
  await goAndConfirm(430, 530, 'мини-игра в Риме');
  await minigame(() => { const st = window.__minigame._state; st.lives = 1; st.obstacles.push({ name: 'suitcase', x: 40, w: 60, h: 80 }); });
  step('  ' + await progress());
  await goAndConfirm(560, 650, 'викторина в Риме'); await quiz();
  step('  ' + await progress());
  const finale = await p.waitForSelector('.msc-finale-stage', { timeout: 5000 }).then(() => true).catch(() => false);
  step(finale ? 'ФИНАЛ показан' : 'ФИНАЛ НЕ ПОКАЗАН');
  if (finale) { await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/playthrough_finale_${tag}.png` }); }
  const hud = await p.evaluate(() => document.querySelector('.msc-hud-top')?.innerText.replace(/\s+/g, ' '));
  step(`HUD: ${hud}`);
  step(`ошибки JS: ${JSON.stringify(errors)}`);
  await b.close();
})().catch(async (e) => { console.error('FAIL', e.message); process.exit(1); });
