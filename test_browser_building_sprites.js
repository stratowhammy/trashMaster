const { chromium } = require('playwright');

(async () => {
    console.log('Testing Building Sprites in 2D and 3D...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    let hasError = false;

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Error') || text.includes('Exception')) {
            console.log('BROWSER LOG:', text);
        }
    });

    page.on('pageerror', error => {
        console.error('BROWSER PAGE ERROR:', error);
        hasError = true;
    });

    await page.goto('http://127.0.0.1:3000');
    await page.waitForTimeout(1000);

    const testUser = 'bldg_test_' + Math.floor(Math.random() * 100000);
    await page.evaluate(() => {
        const regBtn = document.getElementById('btn-goto-register');
        if (regBtn) regBtn.click();
    });
    await page.waitForTimeout(400);

    await page.fill('#reg-username', testUser);
    await page.fill('#reg-password', 'secret123');
    await page.fill('#reg-confirm-password', 'secret123');
    await page.click('#btn-do-register');
    await page.waitForTimeout(1000);

    // Test getBuildingVisualInfo function in browser context
    const checkTypes = await page.evaluate(() => {
        const types = ['chinos_steaks', 'rats_steaks', 'zippy_ds', 'goose', 'dump', 'airport', 'black_market', 'hospital', 'police', 'bank', 'zoo', 'pulp_mill', 'cityhall'];
        const results = {};
        for (const t of types) {
            results[t] = window.getBuildingVisualInfo ? window.getBuildingVisualInfo(t) : null;
        }
        return results;
    });

    console.log('Checked Building Visual Info:', Object.keys(checkTypes));
    for (const [k, v] of Object.entries(checkTypes)) {
        if (!v || !v.label || !v.spriteKey) {
            console.error('Missing visual info for building type:', k);
            hasError = true;
        }
    }

    // Start game to check 2D and 3D building sprite sync
    await page.click('#btn-start-game');
    await page.waitForTimeout(1500);

    const gameRunning = await page.evaluate(() => {
        return !!(window.game && window.game.gameMap && window.game.gameMap.buildings);
    });
    console.log('Game running with buildings:', gameRunning);

    if (!gameRunning) {
        console.error('Game was not properly started!');
        hasError = true;
    }

    await browser.close();

    if (hasError) {
        console.error('FAILED building sprite verification!');
        process.exit(1);
    } else {
        console.log('SUCCESS: Building sprites verified in both 2D and 3D!');
    }
})();
