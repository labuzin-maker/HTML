const { chromium } = require('playwright');
const path = require('path');

const DIR = __dirname;
const SLIDES = ['slide1', 'slide2', 'slide3', 'slide4', 'slide5', 'slide6'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1440 }, deviceScaleFactor: 2 });
  for (const name of SLIDES) {
    const filePath = 'file://' + path.join(DIR, name + '.html');
    await page.goto(filePath);
    await page.screenshot({ path: path.join(DIR, name + '.png') });
    console.log('rendered', name);
  }
  await browser.close();
})();
