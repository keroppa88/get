const fs = require('fs');
const path = require('path');

const INPUT = path.join('data', 'jpx.csv');
const OUT_DIR = path.join('data', 'pricedata');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const lines = fs.readFileSync(INPUT, 'utf8').split(/\r?\n/);

// jpx.csv から「データ更新日時」行を探して日付を抽出
let dataDate = null;
for (const line of lines) {
  const row = line.replace(/^"|"$/g, '');
  // 「データ更新日時	2026/01/29 16:55」のような行を探す
  const match = row.match(/^データ更新日時\s+(\d{4})\/(\d{2})\/(\d{2})/);
  if (match) {
    dataDate = `${match[1]}-${match[2]}-${match[3]}`;
    break;
  }
}

if (!dataDate) {
  console.error('データ更新日時が見つかりません');
  process.exit(1);
}

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
`${dataDate},${open},${high},${low},${close},,,,,`;

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

  // 最終行の日付を取得して重複チェック
  const lastRow = rows[rows.length - 1];
  const lastDate = lastRow.split(',')[0];
  if (lastDate === dataDate) continue;

  // 重複なし → 末尾に追記
  fs.writeFileSync(outPath, existing + '\n' + newLine, 'utf8');
}
