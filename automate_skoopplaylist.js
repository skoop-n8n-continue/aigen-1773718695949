const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RUN_FILES = path.join(process.cwd(), 'run_files');
if (!fs.existsSync(RUN_FILES)) {
    fs.mkdirSync(RUN_FILES, { recursive: true });
}

async function run() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'],
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    const logs = { console: [], errors: [], network: [] };
    page.on('console', msg => logs.console.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => logs.errors.push({ message: err.message, stack: err.stack }));

    try {
        console.log('1. Navigating to login page...');
        await page.goto('https://cloud.skoopsignage.com/', { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(RUN_FILES, '01_login_page.png') });

        console.log('2. Logging in...');
        await page.getByPlaceholder('Email').fill('joshm@skoop.digital');
        await page.getByPlaceholder('Password').fill('PjF4zw3HS');
        await page.getByRole('button', { name: /Sign In/i }).click();

        console.log('3. Waiting for login to complete...');
        await page.waitForLoadState('networkidle', { timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(RUN_FILES, '03_after_login.png') });

        console.log('4. Navigating to Playlists...');
        await page.goto('https://cloud.skoopsignage.com/playlists', { waitUntil: 'networkidle', timeout: 60000 });
        await page.screenshot({ path: path.join(RUN_FILES, '04_playlists_page.png') });

        console.log('5. Clicking Create Playlist...');
        await page.locator('button').filter({ hasText: /^Create Playlist$/ }).click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(RUN_FILES, '05_create_modal.png') });

        console.log('6. Naming playlist...');
        const nameInput = page.locator('input#name, input[name="name"]').filter({ visible: true }).first();
        await nameInput.waitFor({ state: 'visible', timeout: 15000 });
        const playlistName = 'Wiki Test ' + Date.now();
        await nameInput.fill(playlistName);
        await page.screenshot({ path: path.join(RUN_FILES, '06_name_filled.png') });

        console.log('7. Saving playlist...');
        await page.locator('button').filter({ hasText: /^Save$/ }).filter({ visible: true }).first().click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(RUN_FILES, '07_playlist_created.png') });

        console.log('8. Opening the new playlist to add media...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
        const playlistRow = page.locator('div, tr, td').filter({ hasText: playlistName }).filter({ visible: true }).first();
        await playlistRow.waitFor({ state: 'visible', timeout: 15000 });
        await playlistRow.click();

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(RUN_FILES, '08_in_playlist.png') });

        console.log('9. Adding media from sidebar...');
        // Look for "Media" in the right-hand sidebar
        const mediaSidebarItem = page.locator('div, li, span, p').filter({ hasText: /^Media$/ }).filter({ visible: true }).first();
        await mediaSidebarItem.waitFor({ state: 'visible', timeout: 15000 });
        await mediaSidebarItem.click();

        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(RUN_FILES, '09_media_library.png') });

        console.log('10. Selecting first media item...');
        // In the media library, click the first item
        const firstMedia = page.locator('.media-item, .library-item, img, [role="gridcell"]').filter({ visible: true }).first();
        await firstMedia.waitFor({ state: 'visible', timeout: 15000 });
        await firstMedia.click();
        await page.screenshot({ path: path.join(RUN_FILES, '10_media_selected.png') });

        console.log('11. Confirming media add...');
        // Look for Add/Confirm button
        const confirmBtn = page.locator('button').filter({ hasText: /Add|Insert|Confirm/i }).filter({ visible: true }).first();
        if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
        } else {
            // Try to find any primary button in the dialog
            await page.locator('.MuiButton-containedPrimary, .btn-primary').filter({ visible: true }).first().click();
        }

        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(RUN_FILES, '11_final_result.png') });

        console.log('SUCCESS: Flow completed.');

    } catch (err) {
        console.error('FAILURE:', err.message);
        await page.screenshot({ path: path.join(RUN_FILES, 'error_state.png') });
    } finally {
        await context.close();
        await browser.close();
    }
}

run();
