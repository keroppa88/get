// data/fmp.json を読み込み → data/pricedata/*.csv に整形・追記

const fs = require('fs');
const path = require('path');

const INPUT   = path.join('data', 'fmp.json');
const OUT_DIR = path.join('data', 'pricedata');

// FMPシンボル → 出力CSVファイル名
const INDICES = [
  // 米国
  { symbol: '^DJI',      file: 'NYダウ.csv',       name: 'NYダウ' },
  { symbol: '^GSPC',     file: 'S&P500.csv',        name: 'S&P500' },
  { symbol: '^IXIC',     file: 'ナスダック.csv',    name: 'ナスダック' },
  { symbol: '^RUT',      file: 'ラッセル2000.csv',  name: 'ラッセル2000' },
  { symbol: '^SOX',      file: 'SOX指数.csv',       name: 'SOX指数' },
  // 欧州
  { symbol: '^GDAXI',    file: 'DAX(独).csv',       name: 'DAX(独)' },
  { symbol: '^FTSE',     file: 'FTSE100(英).csv',   name: 'FTSE100(英)' },
  { symbol: '^FCHI',     file: 'CAC40(仏).csv',     name: 'CAC40(仏)' },
  { symbol: '^STOXX50E', file: 'ユーロStoxx50.csv', name: 'ユーロStoxx50' },
  // アジア
  { symbol: '^HSI',      file: '香港ハンセン.csv',  name: '香港ハンセン' },
  { symbol: '000001.SS', file: '上海総合.csv',      name: '上海総合' },
  { symbol: '^TWII',     file: '台湾加権.csv',      name: '台湾加権' },
  { symbol: '^KS11',     file: 'KOSPI(韓).csv',     name: 'KOSPI(韓)' },
];

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function getLastDate(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const stat = fs.fstatSync(fd);
    const readSize = Math.min(stat.size, 128);
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, stat.size - readSize);
    const tail = buf.toString('utf8');
    const lines = tail.split(/\r?\n/).filter(Boolean);
    const lastLine = lines[lines.length - 1];
    return lastLine ? lastLine.split(',')[0] : null;
  } finally {
    fs.closeSync(fd);
  }
}

function appendIfNotExists(outPath, dateISO, open, high, low, close, volume) {
  const header = 'Date,Open,High,Low,Close,Volume,TradingValue,UpLimit,LowLimit';
  const newLine = `${dateISO},${open},${high},${low},${close},${volume || ''},,,`;

  if (!fs.existsSync(outPath)) {
    fs.writeFileSync(outPath, `${header}\n${newLine}\n`, 'utf8');
    return true;
  }

  const lastDate = getLastDate(outPath);
  if (lastDate === dateISO) {
    console.log(`  skip (already exists): ${dateISO}`);
    return false;
  }

  fs.appendFileSync(outPath, `${newLine}\n`, 'utf8');
  return true;
}

(function main() {
  ensureDir(OUT_DIR);

  const quotes = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

  let savedCount = 0;
  for (const idx of INDICES) {
    const q = quotes.find(q => q.symbol === idx.symbol);
    if (!q) {
      console.log(`[SKIP] ${idx.name} (${idx.symbol}): データなし`);
      continue;
    }

    if (!q.timestamp) {
      console.log(`[SKIP] ${idx.name}: timestamp なし`);
      continue;
    }

    const dateISO = new Date(q.timestamp * 1000).toISOString().slice(0, 10);
    const open    = q.open     ?? q.price;
    const high    = q.dayHigh  ?? q.price;
    const low     = q.dayLow   ?? q.price;
    const close   = q.price;
    const volume  = q.volume   ?? '';

    if (!close) {
      console.log(`[SKIP] ${idx.name}: price なし`);
      continue;
    }

    const outPath = path.join(OUT_DIR, idx.file);
    const saved = appendIfNotExists(outPath, dateISO, open, high, low, close, volume);
    if (saved) {
      console.log(`[OK]   ${idx.name}: ${dateISO}  close=${close}`);
      savedCount++;
    }
  }

  console.log(`\n完了: ${savedCount}件 保存`);
})();
