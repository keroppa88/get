const fs = require('fs');
const path = require('path');

const INPUT = 'JPX.csv';
const OUT_DIR = path.join('Data', 'PriceData');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const today = new Date().toISOString().slice(0, 10);

const lines = fs.readFileSync(INPUT, 'utf8').split(/\r?\n/);

let readData = false;

for (const line of lines) {
  const row = line.replace(/^"|"$/g, '');
  if (!row) continue;

  // ヘッダ検出
  if (row.startsWith('指数名\t現在値\t前日比\t始値\t高値\t安値')) {
    readData = true;
    continue;
  }

  if (!readData) continue;

  // セクション終端
  if (row === '先頭に戻る') {
    readData = false;
    continue;
  }

  const cols = row.split('\t');
  if (cols.length < 7) continue;

  const name = cols[0].trim();
  const close = cols[1].replace(/,/g, '');
  const open = cols[4].replace(/,/g, '');
  const high = cols[5].replace(/,/g, '');
  const low  = cols[6].replace(/,/g, '');

  if ([open, high, low, close].some(v => v === '--' || v === '')) continue;

  const csv =
`Date,Open,High,Low,Close,Volume,TradingValue,UpLimit,LowLimit
${today},${open},${high},${low},${close},,,,,`;

  const safeName = name.replace(/[\\\/:*?"<>|]/g, '_');
  const outPath = path.join(OUT_DIR, `${safeName}.csv`);

  fs.writeFileSync(outPath, csv, 'utf8');
}
