// ●日経 国内株式指標（nikkeisijo.csv）から市況ボードの値を抽出
// 「指標名」「M/D 時刻等」「現在値」の3行パターンを検出する
// （日経平均(円)、ドル(円)、NYダウ(ドル)、FTSE100、上海総合、長期金利 など）

const fs = require('fs');
const path = require('path');

const INPUT = path.join('data', 'nikkeisijo.csv');
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

// M/D（年なし）から日付を補完。未来日付になる場合は前年とみなす
function mdToISO(m, d) {
  const now = new Date(Date.now() + 9 * 3600 * 1000); // JST
  let y = now.getUTCFullYear();
  const t = Date.UTC(y, Number(m) - 1, Number(d));
  if (t - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) > 30 * 86400000) y--;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

(function main() {
  const lines = fs.readFileSync(INPUT, 'utf8').split(/\r?\n/).filter(Boolean).map(unquote);

  const dateLineRe = /^(\d{1,2})\/(\d{1,2})(?:\s|$)/;
  // 「160.04-05」のような気配値にも対応し、先頭の数値のみ取る
  const valueRe = /^-?[\d,]+(?:\.\d+)?/;

  const seen = new Set();
  let count = 0;

  for (let i = 0; i < lines.length - 2; i++) {
    const name = lines[i].trim();
    const dm = lines[i + 1].trim().match(dateLineRe);
    const value = lines[i + 2].trim();

    if (!name || name.includes('\t') || /^[\d,.+\-]+$/.test(name)) continue;
    if (!dm) continue;
    const vm = value.match(valueRe);
    if (!vm || !/^[\d\-]/.test(value)) continue;

    if (seen.has(name)) continue; // 同一指標の重複表示はスキップ
    seen.add(name);

    const dateISO = mdToISO(dm[1], dm[2]);
    const close = vm[0].replace(/,/g, '');
    const outPath = path.join(OUT_DIR, `${sanitizeFilename(name)}.csv`);
    appendIfNotExists(outPath, dateISO, close, close, close, close);
    console.log('saved:', outPath, 'date:', dateISO);
    count++;
    i += 2;
  }

  if (count === 0) throw new Error('指標データを1件も抽出できません');
  console.log(`total: ${count}`);
})();
