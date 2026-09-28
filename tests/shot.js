const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--disable-dev-shm-usage'] });
  const shots = [
    ['home', '#/home', 1440, 1000],
    ['home-mobile', '#/home', 390, 844],
    ['ideas', '#/ideas', 1440, 1000],
    ['planner', '#/planner', 1440, 1000],
    ['guide', '#/guide', 1440, 1000],
    ['quiz', '#/quiz', 1440, 1000],
    ['stories', '#/stories', 1440, 1000],
    ['about', '#/about', 1440, 1000],
    ['tablet', '#/ideas', 834, 1100]
  ];
  for (const [name, hash, w, h] of shots) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto('file:///home/user/index.html' + hash, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: `/home/user/shots/${name}.png` });
    if (errs.length) console.log('ERRORS on ' + name + ': ' + errs.join(' | '));
    await p.close();
  }
  // full page home screenshot
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto('file:///home/user/index.html#/home', { waitUntil: 'load' });
  await p.waitForTimeout(800);
  await p.evaluate(async () => { for (let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));} window.scrollTo(0,0); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: '/home/user/shots/home-full.png', fullPage: true });
  await b.close();
  console.log('screenshots done');
})();
