// ●米国googleスプレッドシート
// npm i playwright
// 内部構造で表取得。

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

//●サイトアドレス
(async () => {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSL9K4lttSGzJuN-OO7yKTA68u2pdIkVsmoRN2XfU8oKJAkR_ORPakgHlioMZRYnxA-JwU0X_BizRgF/pubhtml';

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
// ページを開く（完全読み込みまで待機）
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000); // 描画完了待ち

// iframeがあればその中を取得、なければメインページから取得
  let frame = page;
  const iframeElement = await page.$('iframe');
  if (iframeElement) {
    const contentFrame = await iframeElement.contentFrame();
    if (contentFrame) frame = contentFrame;
  }

// 表のセルデータを取得してCSV形式に変換
  const text = await frame.evaluate(() => {
    // 複数のセレクタを試す
    const selectors = ['table', '#sheets-viewport table', '.sheet-table', 'table.waffle'];
    let table = null;
    for (const sel of selectors) {
      table = document.querySelector(sel);
      if (table) break;
    }
    if (!table) return '';

    const rows = table.querySelectorAll('tr');
    const csvRows = [];

    for (const row of rows) {
      const cells = row.querySelectorAll('td'); // thは行番号なので除外
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
