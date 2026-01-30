// ●米国googleスプレッドシート
// npm i playwright

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

//●サイトアドレス
(async () => {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSL9K4lttSGzJuN-OO7yKTA68u2pdIkVsmoRN2XfU8oKJAkR_ORPakgHlioMZRYnxA-JwU0X_BizRgF/pubhtml';

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
// ページを開く（軽めの待機設定）
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

// 表が読み込まれるまで待機
  await page.waitForSelector('table.waffle', { timeout: 30000 });
  await page.waitForTimeout(2000); // 描画完了待ち

// 表のセルデータを取得してCSV形式に変換
  const text = await page.evaluate(() => {
    const table = document.querySelector('table.waffle');
    if (!table) return '';

    const rows = table.querySelectorAll('tr');
    const csvRows = [];

    for (const row of rows) {
      const cells = row.querySelectorAll('td, th');
      const rowData = [];
      for (const cell of cells) {
        // セルのテキストを取得（改行やカンマをエスケープ）
        let cellText = cell.innerText.trim();
        // ダブルクォートをエスケープ
        cellText = cellText.replace(/"/g, '""');
        rowData.push(`"${cellText}"`);
      }
      if (rowData.length > 0) {
        csvRows.push(rowData.join(','));
      }
    }
    return csvRows.join('\n');
  });

  // ●保存先ディレクトリ & ファイル
  const dataDir = path.join(__dirname, 'data');
  const filename = path.join(dataDir, 'usa.csv');

  // dataフォルダが無ければ作成
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // CSV保存（BOM付きUTF-8）
  const csvContent = '\uFEFF' + text;
  fs.writeFileSync(filename, csvContent, 'utf8');
  console.log('saved:', filename);

  await browser.close();
})();
