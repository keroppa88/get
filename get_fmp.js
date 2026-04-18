// FMP (Financial Modeling Prep) 無料APIで海外・米国指数を取得
// → data/fmp.json に生データ保存
// 事前設定: 環境変数 FMP_API に APIキーをセット

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.FMP_API;
if (!API_KEY) {
  console.error('Error: 環境変数 FMP_API が設定されていません');
  process.exit(1);
}

const SYMBOLS = [
  // 米国
  '^DJI', '^GSPC', '^IXIC', '^RUT',
  // 欧州
  '^FTSE', '^STOXX50E',
  // アジア
  '^HSI',
];

// 1シンボルずつ個別リクエスト（複数同時指定は有料プラン限定）
async function fetchQuote(symbol) {
  const url = `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.log(`[${res.status}] ${symbol}: ${body.slice(0, 80)}`);
    return null;
  }
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

(async () => {
  const results = [];
  for (const symbol of SYMBOLS) {
    const q = await fetchQuote(symbol);
    if (q) {
      results.push(q);
      console.log(`[OK] ${symbol}: ${q.price}`);
    } else {
      console.log(`[SKIP] ${symbol}`);
    }
  }

  if (results.length === 0) {
    throw new Error('データが1件も取得できませんでした');
  }

  const dataDir = path.join('data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const outPath = path.join(dataDir, 'fmp.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nsaved: ${outPath} (${results.length}件)`);
})();
