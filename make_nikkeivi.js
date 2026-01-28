const fs = require('fs');
const path = require('path');

const INPUT = 'nikkeivi.csv'; // 例: nikkeivi.csv をリポジトリ直下に置く
const OUT_DIR = path.join('data', 'PriceData');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function unquote(s) {
  // 行全体が "..." で囲まれている前提
  return s.replace(/^\uFEFF?"/, '').replace(/"$/, '').trim();
}

function isNumberOnlyLine(s) {
  // 34.33 / 1,234.56 などを許容（カンマは後で消す）
  const t = s.trim();
  return /^-?\d{1,3}(?:,\d{3})*(?:\.\d+)?$/.test(t) || /^-?\d+(?:\.\d+)?$/.test(t);
}

function toNumStr(s) {
  return s.replace(/,/g, '').trim();
}

function sanitizeFilename(name) {
  // Windows 禁止文字は潰す
  return name.replace(/[\\\/:*?"<>|]/g, '_').trim();
}

function extractDateISO(allText) {
  // 例: 2026.01.28(15:50)
  const m = allText.match(/(20\d{2})\.(\d{2})\.(\d{2})\s*\(/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // 見つからない場合は実行日（UTC）にする
  return new Date().toISOString().slice(0, 10);
}

function appendIfNotExists(outPath, dateISO, open, high, low, close) {
  const header = 'Date,Open,High,Low,Close,Volume,TradingValue,UpLimit,LowLimit';
  const newLine = `${dateISO},${open},${high},${low},${close},,,,,`;

  if (!fs.existsSync(outPath)) {
    fs.writeFileSync(outPath, `${header}\n${newLine}\n`, 'utf8');
    return;
  }

  const existing = fs.readFileSync(outPath, 'utf8').trimEnd();
  const rows = existing.split(/\r?\n/);

  // 既に当日があるなら何もしない
  const hasToday = rows.some(r => r.startsWith(dateISO + ','));
  if (hasToday) return;

  // 末尾に追記
  fs.writeFileSync(outPath, existing + '\n' + newLine + '\n', 'utf8');
}

(function main() {
  ensureDir(OUT_DIR);

  const rawLines = fs.readFileSync(INPUT, 'utf8').split(/\r?\n/).filter(Boolean);
  const lines = rawLines.map(unquote);

  const allText = lines.join('\n');
  const dateISO = extractDateISO(allText);

  // 銘柄名：最初に出てくる "日経平均ボラティリティー・インデックス" を採用
  // （必要ならここを一般化するが、あなたのルールでは固定っぽいのでこのまま）
  const targetName = '日経平均ボラティリティー・インデックス';
  const nameIdx = lines.findIndex(s => s === targetName);

  if (nameIdx === -1) {
    throw new Error(`銘柄名が見つかりません: ${targetName}`);
  }

  // 終値：銘柄名行の下にある「数字のみ」行
  let close = null;
  for (let i = nameIdx + 1; i < Math.min(lines.length, nameIdx + 10); i++) {
    if (isNumberOnlyLine(lines[i])) {
      close = toNumStr(lines[i]);
      break;
    }
  }
  if (!close) throw new Error('終値（数字のみ行）が見つかりません');

  // 始値/高値/安値：行頭がそれぞれの行。タブ区切りで "始値\t34.17\t09:00" 形式想定
  function findFirstValue(prefix) {
    const row = lines.find(s => s.startsWith(prefix + '\t') || s.startsWith(prefix + ' '));
    if (!row) return null;
    const parts = row.split(/\t+/);
    // parts[1] が価格の想定
    if (parts.length >= 2 && isNumberOnlyLine(parts[1])) return toNumStr(parts[1]);
    // タブが崩れてる場合の保険：数字っぽいのを拾う
    const m = row.match(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?/);
    return m ? toNumStr(m[0]) : null;
  }

  const open = findFirstValue('始値');
  const high = findFirstValue('高値');
  const low  = findFirstValue('安値');

  if (!open || !high || !low) {
    throw new Error(`始値/高値/安値の抽出に失敗 open=${open}, high=${high}, low=${low}`);
  }

  const outPath = path.join(OUT_DIR, `${sanitizeFilename(targetName)}.csv`);
  appendIfNotExists(outPath, dateISO, open, high, low, close);

  console.log('saved:', outPath, 'date:', dateISO);
})();
