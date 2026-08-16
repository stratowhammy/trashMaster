const { chromium } = require('playwright');

(async () => {
    console.log('Starting Playwright test for Daily Streak Economy and Black Market Mechanics...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    let hasError = false;

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('GAME LOOP EXCEPTION') || text.includes('Game loop error') || text.includes('Unhandled Promise Rejection')) {
            console.error('BROWSER ERROR LOG:', text);
            hasError = true;
        }
    });

    page.on('pageerror', error => {
        console.error('BROWSER PAGE ERROR:', error);
        hasError = true;
    });

    // Navigate to server
    await page.goto('http://127.0.0.1:3000');
    await page.waitForTimeout(1000);

    // Register a new unique test player
    const testUser = 'streak_hero_' + Math.floor(Math.random() * 100000);
    console.log('Registering account:', testUser);
    
    await page.evaluate(() => {
        const regBtn = document.getElementById('btn-goto-register');
        if (regBtn) regBtn.click();
    });
    await page.waitForTimeout(500);

    await page.fill('#reg-username', testUser);
    await page.fill('#reg-password', 'secret123');
    await page.fill('#reg-confirm-password', 'secret123');
    await page.click('#btn-do-register');

    await page.waitForTimeout(1500);

    // Verify Store Screen is shown and badges exist
    const storeLids = await page.('#store-lids', el => el.innerText);
    const storeStreak = await page.('#store-streak', el => el.innerText);
    console.log('Initial Store Lids Badge:', storeLids);
    console.log('Initial Store Streak Badge:', storeStreak);

    if (storeLids !== '0') {
        console.error('Expected initial lids to be 0, got:', storeLids);
        hasError = true;
    }

    // Check Daily Streak Widget
    const streakBadge = await page.('#streak-counter-badge', el => el.innerText);
    console.log('Streak Widget Badge:', streakBadge);

    // Test Black Market Dialog
    console.log('Testing Black Market Dialog and Lids UI...');
    await page.evaluate(() => {
        if (window.game) {
            window.playerLids = 25;
            window.playerInventory = window.playerInventory || {};
            window.playerInventory['Lids'] = 25;
            window.game.openBlackMarketDialog();
        }
    });
    await page.waitForTimeout(500);

    const bmLids = await page.('#bm-lids-count', el => el.innerText);
    console.log('Black Market Lids in Vault:', bmLids);
    if (bmLids !== '25') {
        console.error('Expected BM lids to show 25, got:', bmLids);
        hasError = true;
    }

    // Test input live dispatch preview calculation
    await page.fill('#bm-lid-input', '8');
    let previewText = await page.('#bm-dispatch-preview', el => el.innerText);
    console.log('Preview for 8 Lids:', previewText);
    if (!previewText.includes('0 Cops')) {
        console.error('Preview for 8 Lids should show 0 Cops, got:', previewText);
        hasError = true;
    }

    await page.fill('#bm-lid-input', '25');
    previewText = await page.('#bm-dispatch-preview', el => el.innerText);
    console.log('Preview for 25 Lids:', previewText);
    if (!previewText.includes('2 Cops')) {
        console.error('Preview for 25 Lids should show 2 Cops, got:', previewText);
        hasError = true;
    }

    // Close Black Market dialog
    await page.click('#btn-bm-close');
    await page.waitForTimeout(500);

    await browser.close();

    if (hasError) {
        console.error('FAILED: Browser test encountered errors!');
        process.exit(1);
    } else {
        console.log('SUCCESS: Browser integration test passed perfectly!');
    }
})();
