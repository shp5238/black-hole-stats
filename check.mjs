import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.waitForSelector('.card-organizer', { timeout: 15000 });
await page.waitForTimeout(1000);

const cards = await page.$$eval('custom-card', (els) =>
  els.map((el) => ({
    label: el.querySelector('h3')?.textContent,
    value: el.querySelector('.card-bg')?.nextElementSibling?.nextElementSibling?.textContent,
    full: el.textContent,
  }))
);

console.log('CARDS:', JSON.stringify(cards, null, 2));
console.log('ERRORS:', errors);

await page.screenshot({ path: '/private/tmp/claude-501/-Users-shreya-Library-CloudStorage-OneDrive-Personal-CodePath-BlackHole/d4ca714c-b270-438d-99dd-bb63d6efb331/scratchpad/screenshot.png', fullPage: true });

await browser.close();
