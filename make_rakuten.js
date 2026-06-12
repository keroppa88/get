// ●楽天証券 世界の主要指数・外国為替・金利一覧（rakuten.csv）から各指標の値を抽出
// 「指標名\t現在値\t...\t更新日時」のタブ区切り行を検出する
// （株価指数・先物・外国為替・コモディティ・債券・政策金利の全テーブルに対応）

const fs = require('fs');
const path = require('path');

const INPUT = path.join('data', 'rakuten.csv');
const OUT_DIR = path.join('data', 'pricedata');
const HEADER = 'Date,Open,High,Low,Close,Volume,TradingValue,UpLimit,LowLimit';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function unquote(s) {
  return s.replace(/^﻿?"/, '').replace(/"$/, '').trim();
}

function sanitizeFilename(name) {
  return name.replace(/[\\\/:*?"<>|]/g, '_').trim();
}

function getLastDate(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const stat = fs.fstatSync(fd);
    const readSize = Math.min(stat.size, 128);
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, stat.size - readSize);
    const tail = buf.toString('utf8');
    const tlines = tail.split(/\r?\n/).filter(Boolean);
    const lastLine = tlines[tlines.length - 1];
    return lastLine ? lastLine.split(',')[0] : null;
  } finally {
    fs.closeSync(fd);
  }
}

function appendIfNotExists(outPath, dateISO, open, high, low, close) {
  const newLine = `${dateISO},${open},${high},${low},${close},,,,`;
  if (!fs.existsSync(outPath)) {
    fs.writeFileSync(outPath, `${HEADER}\n${newLine}\n`, 'utf8');
    return;
  }
  if (getLastDate(outPath) === dateISO) return;
  fs.appendFileSync(outPath, `${newLine}\n`, 'utf8');
}

// MM/DD（年なし）から日付を補完。未来日付になる場合は前年とみなす
function mdToISO(m, d) {
  const now = new Date(Date.now() + 9 * 3600 * 1000); // JST
  let y = now.getUTCFullYear();
  const t = Date.UTC(y, Number(m) - 1, Number(d));
  if (t - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) > 30 * 86400000) y--;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

(function main() {
  const lines = fs.readFileSync(INPUT, 'utf8').split(/\r?\n/).filter(Boolean).map(unquote);

  // 収集対象（ホワイトリスト）。これ以外の指標は記録しない。
  // 指数・為替・債券・政策金利は提示された収集項目のみ、商品先物は全て保持。
  const keepNames = new Set([
    // 株価指数
    '香港ハンセン指数',
    '上海総合指数',
    'ジャカルタ総合指数',
    'タイSET指数',
    'インドSENSEX',
    'ブラジルボベスパ指数',
    '独DAX30指数',
    '仏CAC40指数',
    '英FT100指数',
    'VIX指数',
    // 為替
    'ユーロ/円',
    // コモディティ（商品先物は保持）
    '原油（WTI原油先物）',
    '天然ガス（Henry Hub）先物（NYMEX）',
    '金（現物 1oz.あたり）',
    'Gold先物（COMEX)',
    'プラチナ先物（NYMEX）',
    'Silver先物（COMEX)',
    'Copper先物（COMEX)',
    'Corn先物（CBOT）',
    'Wheat先物（CBOT）',
    'Soybeans先物（CBOT）',
    // 債券
    '日本国債5年',
    '日本国債10年',
    '米国10年国債',
    'ドイツ10年国債',
    'イギリス10年国債',
    'フランス10年国債',
    'ユーロ圏10年国債',
    // 政策金利
    '日本 無担保コール翌日物',
  ]);

  let count = 0;

  for (const line of lines) {
    if (!line.includes('\t')) continue;
    const cols = line.split('\t').map(c => c.trim());
    if (cols.length < 3) continue;

    const name = cols[0];
    const value = cols[1];
    const dateCol = cols[cols.length - 1];

    if (!keepNames.has(name)) continue;
    if (!/^-?[\d,]+(?:\.\d+)?$/.test(value)) continue;

    // 更新日時列から日付を取得（"06/12 15:45" / "06/11" / "2026/06/12 17:00"）
    let dateISO = null;
    let m = dateCol.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (m) {
      dateISO = `${m[1]}-${m[2]}-${m[3]}`;
    } else {
      m = dateCol.match(/^(\d{2})\/(\d{2})/);
      if (m) dateISO = mdToISO(m[1], m[2]);
    }
    if (!dateISO) continue;

    const close = value.replace(/,/g, '');
    const outPath = path.join(OUT_DIR, `${sanitizeFilename(name)}.csv`);
    appendIfNotExists(outPath, dateISO, close, close, close, close);
    console.log('saved:', outPath, 'date:', dateISO);
    count++;
  }

  if (count === 0) throw new Error('指標データを1件も抽出できません');
  console.log(`total: ${count}`);
})();
