const fs = require('fs');
const path = require('path');

const INPUT = path.join('data', 'usa.csv');
const OUT_DIR = path.join('data', 'pricedata');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
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

(function main() {
  ensureDir(OUT_DIR);

  const rawLines = fs.readFileSync(INPUT, 'utf8').split(/\r?\n/).filter(Boolean);
  const rows = rawLines.map(parseCSVLine);

  // 日付取得 (行3の更新日時: "2026/01/29 16:00:00")
  let dateISO = null;
  for (const row of rows) {
    if (row[0] && /^\d{4}\/\d{2}\/\d{2}/.test(row[0])) {
      const m = row[0].match(/^(\d{4})\/(\d{2})\/(\d{2})/);
      if (m) {
        dateISO = `${m[1]}-${m[2]}-${m[3]}`;
        break;
      }
    }
  }
  if (!dateISO) throw new Error('日付を取得できません');

  // 指数データ抽出用
  // データ順: 列4=終値, 列5=始値, 列6=高値, 列7=安値
  const indices = [
    { file: 'NYダウ.csv', code: 'INDEXDJX:.DJI', name: 'NYダウ' },
    { file: 'S&P500.csv', code: 'INDEXSP:.INX', name: 'S&P500' },
    { file: 'ナスダック.csv', code: 'INDEXNASDAQ:.IXIC', name: 'ナスダック' },
    { file: 'ラッセル2000.csv', code: 'INDEXRUSSELL:RUT', name: 'ラッセル2000' },
    { file: 'SOX指数.csv', code: 'INDEXNASDAQ:SOX', name: 'SOX指数' },
  ];

  for (const idx of indices) {
    const row = rows.find(r => r[2] === idx.code);
    if (!row) {
      console.log(`${idx.name} (${idx.code}) が見つかりません`);
      continue;
    }
    // 列4=終値, 列5=始値, 列6=高値, 列7=安値
    const close = row[4];
    const open = row[5];
    const high = row[6];
    const low = row[7];

    if (!close || !open || !high || !low) {
      console.log(`${idx.name}: データ不足 close=${close}, open=${open}, high=${high}, low=${low}`);
      continue;
    }

    const outPath = path.join(OUT_DIR, idx.file);
    appendIfNotExists(outPath, dateISO, open, high, low, close);
    console.log('saved:', outPath, 'date:', dateISO);
  }

  // 008.csv: 時価総額の隣にある数値 (21.5296)
  // 行10: ["","","","","","時価総額","21.5296",...]
  let marketCapValue = null;
  for (const row of rows) {
    if (row[5] === '時価総額') {
      marketCapValue = row[6];
      break;
    }
  }

  if (marketCapValue) {
    const outPath = path.join(OUT_DIR, 'M7時価総額.csv');
    appendIfNotExists(outPath, dateISO, marketCapValue, marketCapValue, marketCapValue, marketCapValue);
    console.log('saved:', outPath, 'date:', dateISO);
  } else {
    console.log('M7時価総額の値が見つかりません');
  }
})();
