/* global __dirname */
const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  const svg = await fs.readFile(path.join(__dirname, '../assets/imperium-icon.svg'), 'utf8');
  await page.setContent(`<style>*{margin:0}body{background:#0c0f12}svg{width:100vw;height:100vh}</style>${svg}`);
  await page.screenshot({ path: path.join(__dirname, '../assets/icon.png') });
  await page.setViewportSize({width:64,height:64});
  await page.screenshot({ path: path.join(__dirname, '../assets/favicon.png') });
  await browser.close();
})();
