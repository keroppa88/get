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

// 無料プランで使える全指数一覧エンドポイント
// make_fmp.js 側でシンボルを絞り込む

(async () => {
  const url = `https://financialmodelingprep.com/api/v3/quotes/index?apikey=${API_KEY}`;
  console.log('Fetching: /v3/quotes/index ...');

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  const data = await res.json();

  if (data && data['Error Message']) {
    throw new Error(`API Error: ${data['Error Message']}`);
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('データが取得できませんでした。APIキーまたはシンボルを確認してください。');
  }

  const dataDir = path.join('data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const outPath = path.join(dataDir, 'fmp.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`saved: ${outPath} (${data.length}件)`);
})();
