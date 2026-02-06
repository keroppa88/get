// make_bitcoin.js
// data/bitcoin.csv から ビットコイン価格を抽出し、data/pricedata/ビットコイン.csv へ upsert する

const fs = require('fs');
const path = require('path');

const INPUT = path.join('data', 'bitcoin.csv');
const OUT_DIR = path.join('data', 'pricedata');
const OUT_FILE = path.join(OUT_DIR, 'ビットコイン.csv');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function unquote(s) {
  return s.replace(/^\uFEFF?"/, '').replace(/"$/, '').trim();
}

// カンマ付き数値を数値文字列に変換  "10,042,532" → "10042532"
function toNum(s) {
  return s.replace(/,/g, '').replace(/\+/g, '').trim();
}

// 数値っぽい行かどうか（カンマ区切り含む、先頭に+/-あり可）
function isNumLine(s) {
  return /^[+\-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?$/.test(s.trim());
}

// 東京日付 (YYYY-MM-DD)
function tokyoTodayISO() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const jst = new Date(utcMs + 9 * 60 * 60_000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 最終行の日付だけを取得（ファイル末尾のみ読む）
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

function appendIfNotExists(outPath, dateISO, open, high, low, close) {
  const header = 'Date,Open,High,Low,Close,Volume,TradingValue,UpLimit,LowLimit';
  const newLine = `${dateISO},${open},${high},${low},${close},,,,`;

  if (!fs.existsSync(outPath)) {
    fs.writeFileSync(outPath, `${header}\n${newLine}\n`, 'utf8');
    return;
  }

  const lastDate = getLastDate(outPath);
  if (lastDate === dateISO) return;

  fs.appendFileSync(outPath, `${newLine}\n`, 'utf8');
}

// ラベルの次の行から数値を取得
function findValueAfterLabel(lines, label) {
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].includes(label)) {
      const next = lines[i + 1];
      if (isNumLine(next)) return toNum(next);
    }
  }
  return null;
}

(function main() {
  ensureDir(OUT_DIR);

  const rawLines = fs.readFileSync(INPUT, 'utf8').split(/\r?\n/).filter(Boolean);
  const lines = rawLines.map(unquote);

  const close = findValueAfterLabel(lines, '売却価格（円）');
  const high  = findValueAfterLabel(lines, '当日高値');
  const low   = findValueAfterLabel(lines, '当日安値');
  const diff  = findValueAfterLabel(lines, '前日比');

  if (!close) throw new Error('売却価格が見つかりません');
  if (!high)  throw new Error('当日高値が見つかりません');
  if (!low)   throw new Error('当日安値が見つかりません');

  // Open = Close - 前日比（前日終値 ≒ 当日始値）
  let open = '';
  if (diff) {
    open = String(Number(close) - Number(diff));
  }

  const today = tokyoTodayISO();
  appendIfNotExists(OUT_FILE, today, open, high, low, close);

  console.log('saved:', OUT_FILE, 'date:', today);
  console.log(`O=${open} H=${high} L=${low} C=${close}`);
})();
