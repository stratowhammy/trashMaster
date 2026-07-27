const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let hasError = false;
  page.on('console', msg => {
    console.log('BROWSER_LOG:', msg.text());
    if (msg.text().includes('GAME LOOP EXCEPTION') || msg.text().includes('Game loop error')) {
      hasError = true;
    }
  });
  page.on('pageerror', error => {
    console.log('BROWSER_ERROR:', error);
    hasError = true;
  });
  await page.goto('http://127.0.0.1:3000');
  
  await page.evaluate(() => {
    const pToggle = document.getElementById('pirate-toggle');
    if (pToggle) {
      pToggle.checked = true;
      window.pirateMode = true;
    }
  });
  
  await page.waitForTimeout(3000);
  await browser.close();
  if (hasError) {
    console.error("Test failed with browser errors!");
    process.exit(1);
  } else {
    console.log("Test passed cleanly with pirate mode enabled!");
  }
})();
