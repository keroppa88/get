// ●Yahoo!ファイナンス 売買代金上位ランキング（yahoofinance.csv）から個別銘柄の株価を抽出
// 「順位\t銘柄名」「コード」「市場」「掲示板」「取引値」「時刻」「前日比」「前日比%」「売買代金」の並びを検出する

const fs = require('fs');
const path = require('path');

const INPUT = path.join('data', 'yahoofinance.csv');
const OUT_DIR = path.join('data', 'pricedata');
const HEADER = 'Date,Open,High,Low,Close,Volume,TradingValue,UpLimit,LowLimit';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function unquote(s) {
  return s.replace(/^﻿?"/, '').replace(/"$/, '').trim();
}

function isNumberOnlyLine(s) {
  const t = s.trim();
  return /^-?\d{1,3}(?:,\d{3})*(?:\.\d+)?$/.test(t) || /^-?\d+(?:\.\d+)?$/.test(t);
}

function toNumStr(s) {
  return s.replace(/,/g, '').trim();
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

function appendIfNotExists(outPath, dateISO, open, high, low, close, tradingValue) {
  const newLine = `${dateISO},${open},${high},${low},${close},,${tradingValue || ''},,`;
  if (!fs.existsSync(outPath)) {
    fs.writeFileSync(outPath, `${HEADER}\n${newLine}\n`, 'utf8');
    return;
  }
  if (getLastDate(outPath) === dateISO) return;
  fs.appendFileSync(outPath, `${newLine}\n`, 'utf8');
}

(function main() {
  const lines = fs.readFileSync(INPUT, 'utf8').split(/\r?\n/).filter(Boolean).map(unquote);

  // 更新日時から日付を取得
  let dateISO = null;
  for (const line of lines) {
    const m = line.match(/更新日時：(\d{4})\/(\d{2})\/(\d{2})/);
    if (m) {
      dateISO = `${m[1]}-${m[2]}-${m[3]}`;
      break;
    }
  }
  if (!dateISO) throw new Error('更新日時が見つかりません');

  let count = 0;

  for (let i = 0; i < lines.length - 8; i++) {
    const rankMatch = lines[i].match(/^(\d+)\t(.+)$/);
    if (!rankMatch) continue;

    const name = rankMatch[2].trim();
    const code = lines[i + 1].trim();
    const board = lines[i + 3].trim();
    const price = lines[i + 4].trim();
    const tradingValue = lines[i + 8].trim();

    if (!/^[0-9A-Z]{4,5}$/.test(code)) continue;
    if (board !== '掲示板') continue;
    if (!isNumberOnlyLine(price)) continue;
    if (!isNumberOnlyLine(tradingValue)) continue;

    const close = toNumStr(price);
    const outPath = path.join(OUT_DIR, `${sanitizeFilename(name)}.csv`);
    appendIfNotExists(outPath, dateISO, close, close, close, close, toNumStr(tradingValue));
    console.log('saved:', outPath, 'date:', dateISO);
    count++;
    i += 8;
  }

  if (count === 0) throw new Error('銘柄データを1件も抽出できません');
  console.log(`total: ${count}`);
})();
