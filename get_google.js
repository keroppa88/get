// ●Google スプレッドシート（公開pubhtml・指数の四本値）
// npm i playwright
// テーブル本体(table.waffle)はJSで遅延描画されるため、その要素の描画を待ってから取得する

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

//●サイトアドレス
(async () => {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7eH7iB8R0rTlZvLUFT7gWiVbQDm5DiwzHqOcvE-ocLaya7mYdRAcNGhBwf6QAGCtIz1u0Jk9692D3/pubhtml?gid=0&single=true';

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // ページを開く
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  // テーブル本体の描画を待つ（失敗してもbodyにフォールバック）
  // innerText('table.waffle') はセル間がタブ・行ごとに改行で得られる
  let text;
  try {
    await page.waitForSelector('table.waffle tbody tr td', { timeout: 30000 });
    text = await page.innerText('table.waffle');
  } catch (e) {
    console.log('waffle table not found, fallback to body:', e.message);
    await page.waitForTimeout(5000);
    text = await page.innerText('body');
  }

  // ●保存先ディレクトリ & ファイル
  const dataDir = path.join(__dirname, 'data');
  const filename = path.join(dataDir, 'google.csv');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // CSV生成　改行ごとに1行として書き込む
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  let csvContent = '\uFEFF'; // BOM
  for (const line of lines) {
    csvContent += `"${line.replace(/"/g, '""')}"\n`;
  }

  fs.writeFileSync(filename, csvContent, 'utf8');
  console.log('saved:', filename, `(${lines.length} lines)`);

  await browser.close();
})();
