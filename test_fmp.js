// FMP APIエンドポイントの動作確認用テストスクリプト
// node test_fmp.js

const API_KEY = process.env.FMP_API;
if (!API_KEY) { console.error('FMP_API が未設定'); process.exit(1); }

const endpoints = [
  `/stable/index-quote?symbol=%5EDJI`,
  `/stable/quote?symbol=%5EDJI`,
  `/stable/quote?symbol=SPY`,           // ETF (インデックス代替)
  `/stable/quote?symbol=AAPL`,          // 個別株（動作確認）
  `/stable/indexes-list`,
  `/stable/all-index-quotes`,
];

(async () => {
  for (const ep of endpoints) {
    const url = `https://financialmodelingprep.com${ep}&apikey=${API_KEY}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const preview = text.slice(0, 120).replace(/\n/g, ' ');
      console.log(`[${res.status}] ${ep}`);
      console.log(`        ${preview}`);
    } catch (e) {
      console.log(`[ERR] ${ep}: ${e.message}`);
    }
  }
})();
