// FMP (Financial Modeling Prep) 無料APIで海外・米国指数を取得
// 事前設定: 環境変数 FMP_API_KEY に APIキーをセット
// https://site.financialmodelingprep.com/

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.FMP_API_KEY;
if (!API_KEY) {
  console.error('Error: 環境変数 FMP_API_KEY が設定されていません');
  process.exit(1);
}

const OUT_DIR = path.join('data', 'pricedata');

// 取得する指数: FMPシンボル → 出力CSVファイル名
const INDICES = [
  // 米国
  { symbol: '^DJI',     file: 'NYダウ.csv',          name: 'NYダウ' },
  { symbol: '^GSPC',    file: 'S&P500.csv',            name: 'S&P500' },
  { symbol: '^IXIC',    file: 'ナスダック.csv',        name: 'ナスダック' },
  { symbol: '^RUT',     file: 'ラッセル2000.csv',      name: 'ラッセル2000' },
  { symbol: '^SOX',     file: 'SOX指数.csv',           name: 'SOX指数' },
  // 欧州
  { symbol: '^GDAXI',   file: 'DAX(独).csv',           name: 'DAX(独)' },
  { symbol: '^FTSE',    file: 'FTSE100(英).csv',        name: 'FTSE100(英)' },
  { symbol: '^FCHI',    file: 'CAC40(仏).csv',          name: 'CAC40(仏)' },
  { symbol: '^STOXX50E',file: 'ユーロStoxx50.csv',      name: 'ユーロStoxx50' },
  // アジア
  { symbol: '^HSI',     file: '香港ハンセン.csv',       name: '香港ハンセン' },
  { symbol: '000001.SS',file: '上海総合.csv',           name: '上海総合' },
  { symbol: '^TWII',    file: '台湾加権.csv',           name: '台湾加権' },
  { symbol: '^KS11',    file: 'KOSPI(韓).csv',          name: 'KOSPI(韓)' },
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

// FMP stable API で複数シンボルの quote を取得
async function fetchQuotes(symbols) {
  const symbolStr = symbols.join(',');
  const url = `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(symbolStr)}&apikey=${API_KEY}`;
  console.log(`Fetching: ${symbols.length} symbols ...`);
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  const data = await res.json();
  // APIエラーメッセージの確認
  if (data && data['Error Message']) {
    throw new Error(`API Error: ${data['Error Message']}`);
  }
  return Array.isArray(data) ? data : [];
}

(async () => {
  ensureDir(OUT_DIR);

  const symbols = INDICES.map(i => i.symbol);
  const quotes = await fetchQuotes(symbols);

  if (quotes.length === 0) {
    console.error('データが取得できませんでした。APIキーまたはシンボルを確認してください。');
    process.exit(1);
  }

  let savedCount = 0;
  for (const idx of INDICES) {
    const q = quotes.find(q => q.symbol === idx.symbol);
    if (!q) {
      console.log(`[SKIP] ${idx.name} (${idx.symbol}): データなし`);
      continue;
    }

    // timestampからISO日付に変換（米国東部時間基準の日付を使用）
    const ts = q.timestamp;
    if (!ts) {
      console.log(`[SKIP] ${idx.name}: timestamp なし`);
      continue;
    }
    const date = new Date(ts * 1000);
    const dateISO = date.toISOString().slice(0, 10);

    const open  = q.open  ?? q.price;
    const high  = q.dayHigh  ?? q.price;
    const low   = q.dayLow   ?? q.price;
    const close = q.price;
    const volume = q.volume ?? '';

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
