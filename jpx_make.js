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

  // データ開始ヘッダ
  if (row.startsWith('指数名\t現在値\t前日比\t始値\t高値\t安値')) {
    readData = true;
    continue;
  }

  if (!readData) continue;

  // セクション終了
  if (row === '先頭に戻る') {
    readData = false;
    continue;
  }

  const cols = row.split('\t');
  if (cols.length < 7) continue;

  const name = cols[0].trim();
  const close = cols[1].replace(/,/g, '');
  const open  = cols[4].replace(/,/g, '');
  const high  = cols[5].replace(/,/g, '');
  const low   = cols[6].replace(/,/g, '');

  if ([open, high, low, close].some(v => v === '--' || v === '')) continue;

  const safeName = name.replace(/[\\\/:*?"<>|]/g, '_');
  const outPath = path.join(OUT_DIR, `${safeName}.csv`);

  const newLine =
`${today},${open},${high},${low},${close},,,,,`;

  // ファイルが無い → 新規作成
  if (!fs.existsSync(outPath)) {
    const header =
`Date,Open,High,Low,Close,Volume,TradingValue,UpLimit,LowLimit
${newLine}
`;
    fs.writeFileSync(outPath, header, 'utf8');
    continue;
  }

  // 既存ファイル確認
  const existing = fs.readFileSync(outPath, 'utf8').trimEnd();
  const rows = existing.split(/\r?\n/);

  // 既に当日分がある → 何もしない
  const hasToday = rows.some(r => r.startsWith(today + ','));
  if (hasToday) continue;

  // 無い → 末尾に追記
  fs.writeFileSync(outPath, existing + '\n' + newLine, 'utf8');
}
