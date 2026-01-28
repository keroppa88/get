from pathlib import Path
import re
import csv
from datetime import datetime
from zoneinfo import ZoneInfo

# ===== paths =====
base = Path("data")
src = base / "yen.csv"
dst_dir = base / "pricedata"
dst = dst_dir / "ドル円.csv"
dst_dir.mkdir(parents=True, exist_ok=True)

# ===== date (Asia/Tokyo) =====
today = datetime.now(ZoneInfo("Asia/Tokyo")).date().isoformat()  # YYYY-MM-DD

def norm_line(s: str) -> str:
    s = s.strip()
    # 行全体が "..." で囲まれている想定
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        s = s[1:-1]
    s = s.replace("\u3000", " ")  # 全角スペース→半角
    s = s.replace("\t", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s

lines = [norm_line(l) for l in src.read_text(encoding="utf-8", errors="ignore").splitlines()]
lines = [l for l in lines if l]

# ===== extract USD/JPY =====
pair = "USD/JPY"
close_ = open_ = high_ = low_ = None

for i, line in enumerate(lines):
    if line.startswith(pair):
        # 2行下: "700 152.655" の 2つ目が終値
        if i + 2 >= len(lines) or i + 3 >= len(lines):
            raise ValueError("USD/JPY ブロックが途中で途切れています。")

        p2 = lines[i + 2].split(" ")
        if len(p2) < 2:
            raise ValueError(f"終値行が想定外: {lines[i+2]}")
        close_ = p2[1]

        # 3行下: "(19:39) +0.465 13,475 152.350 153.080 152.250 130.00"
        p3 = lines[i + 3].split(" ")
        if len(p3) < 6:
            raise ValueError(f"OHLC行が想定外: {lines[i+3]}")
        open_ = p3[3]
        high_ = p3[4]
        low_  = p3[5]
        break

if close_ is None:
    raise ValueError("yen.csv 内に USD/JPY が見つかりませんでした。")

# ===== load existing dst (if any) and upsert =====
default_header = ["Date","Open","High","Low","Close","Volume","TradingValue","UpLimit","UnderLimit"]

rows = []
header = None

if dst.exists():
    with dst.open("r", encoding="utf-8-sig", newline="") as f:
        r = csv.reader(f)
        header = next(r, None)
        if header:
            for row in r:
                if not row:
                    continue
                # 行が短い場合は右側を埋める
                if len(row) < len(header):
                    row = row + [""] * (len(header) - len(row))
                rows.append(row)

# ヘッダ決定：
# - 既存があればそれを尊重
# - ない場合は “例の形式” の9列ヘッダで新規作成
if not header:
    header = default_header

# Date列位置（既存ヘッダが違っても対応）
try:
    date_idx = header.index("Date")
except ValueError:
    # 想定外なら先頭をDate扱いにする
    date_idx = 0

# 必須列位置（なければ追加しない＝既存形式優先）
def col_idx(name: str):
    try:
        return header.index(name)
    except ValueError:
        return None

idx_open = col_idx("Open")
idx_high = col_idx("High")
idx_low  = col_idx("Low")
idx_close= col_idx("Close")

# 今日の日付行を探す
found = False
for row in rows:
    if row[date_idx] == today:
        if idx_open is not None:  row[idx_open]  = open_
        if idx_high is not None:  row[idx_high]  = high_
        if idx_low  is not None:  row[idx_low]   = low_
        if idx_close is not None: row[idx_close] = close_
        found = True
        break

# なければ最終行に追加（他列は 0 埋め）
if not found:
    new_row = [""] * len(header)
    new_row[date_idx] = today
    if idx_open is not None:  new_row[idx_open]  = open_
    if idx_high is not None:  new_row[idx_high]  = high_
    if idx_low  is not None:  new_row[idx_low]   = low_
    if idx_close is not None: new_row[idx_close] = close_

    # 例の形式なら残りを0で埋める（空欄でも良いならここ消してOK）
    for j, name in enumerate(header):
        if name in ("Volume","TradingValue","UpLimit","UnderLimit") and not new_row[j]:
            new_row[j] = "0"

    rows.append(new_row)

# ===== write back =====
with dst.open("w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(header)
    w.writerows(rows)

print(f"saved: {dst}  ({today}  O={open_} H={high_} L={low_} C={close_})")
