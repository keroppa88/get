## 現在の自動運用体制

| 時刻 (JST) | get で収集 | make で抽出 |
|---|---|---|
| **朝 07:00（火〜土）** | usa・minkabucrypto・rakuten | 米国株/指数、暗号資産BTC/ETH/XRP・時価総額、世界の指数・為替・債券・コモディティ |
| **夕 19:00（月〜金）** | nikkei225・jpx・nikkeisemicon・nikkeivi・yen・bitcoin・yomiuri333・yahoofinance・nikkeisijo・nikkeimany・**nikkeietc** | 各指数、読売333、東証統計、先導株比率、日経時刻、**日次サマリー24指標**ほか |

## 夕方 19:00 JST 更新（月〜金）｜get.yml → make.yml

| get / make | データソース | 主な収集対象 |
|---|---|---|
| nikkei225 | 日経平均プロフィル | **日経平均株価**（始値・高値・安値・終値の四本値） |
| nikkeijikoku | 同上(nikkei225.csv) | **日経時刻**（始値/高値/安値を付けた時刻） |
| nikkeietc | 日経平均 日次サマリー | **24指標**: 時価総額・売買代金（各対市場占有率）／PBR・PER・配当利回り（加重/指数/単純）／上昇・下落銘柄数／6セクターの騰落寄与度・ウェート |
| nikkeivi | 日経VIプロフィル | **日経平均ボラティリティー・インデックス** |
| nikkeisemicon | 日経半導体株指数 | **日経半導体株指数** |
| jpx | JPX指数値一覧 | **TOPIX関連約90指数**（TOPIX本体・規模別・33業種別・TOPIX-17・バリュー/グロース、JPX日経400系、東証各市場指数、東証REIT系など）※レバレッジ/インバース6種とJPXプライム150・スタートアップ100は除外 |
| nikkeimany | 日経 指数一覧 | 日経平均内需株50・外需株50・カバードコール・カバードコールATM |
| nikkeisijo | 日経 国内株式指標 | **東証統計**: プライム/スタンダード/グロースの時価総額（兆円）・売買代金（兆円）・PBR・PER予想・配当・株式益利回り・値上がり/値下がり/商い成立銘柄数・値上がり率・年初来高安、時価総額比率 |
| yomiuri333 | 読売333 | **読売株価指数（読売333）** |
| yahoofinance + nikkeisijo | Yahoo!売買代金上位＋日経指標 | **先導株比率**（1～3位/10/20/30/40/50位）※ランキングは比率算出のみに使用、個別株は出力しない |
| bitcoin | ビットコイン | **ビットコイン**（円） |
| yen | 為替 | **ドル円** |

## 朝 07:00 JST 更新（火〜土）｜get_usa.yml → make_usa.yml

| get / make | データソース | 主な収集対象 |
|---|---|---|
| usa | スプレッドシート株価収集power・USA他株価 | **米国指数**: NYダウ・S&P500・ナスダック・ラッセル2000・SOX、**M7時価総額**、**個別株約35銘柄**（アップル・エヌビディア・TSMC・ASML・サムスン・SAP・LVMH・BYD等） |
| google | スプレッドシート株価収集POWER2 | 四本値で台湾韓国香港インド深圳ユーロ仏独英米VIX、S&P500業種別|
| rakuten | 楽天証券 世界の指数等 | **海外指数9種＋VIX**（ハンセン・上海・ジャカルタ・タイSET・SENSEX・ボベスパ・DAX・CAC40・FT100・VIX）、**ユーロ/円**、**商品先物**（原油WTI・天然ガス・金現物/先物・プラチナ・銀・銅・コーン・小麦・大豆）、**債券**（日5年/10年・米10年・独/英/仏/ユーロ圏10年）、**無担保コール翌日物** |
| minkabucrypto | みんかぶ暗号資産 | **BTC・ETH・XRP**（円建て）、**暗号資産時価総額（兆円）** |

現在、getはWEBからの収集のみ。それをchart0にデータ供給している。
以前はデスクトップPCで収集したものをgithub・getにプッシュしていた。
その時に2026/05/26に欠損値が発生した。

# 2026-05-26 欠損CSV一覧
# 判定: 2026-05-25 と 2026-05-27 を持つのに 2026-05-26 が無いファイル
# 原因: 2026-05-26 夕方更新の取りこぼし（当日ジョブが前日表示ページ取得/失敗）
# 生成日: 2026-06-13

JPX日経400インバース・インデックス.csv
JPX日経400ダブルインバース・インデックス.csv
JPX日経400レバレッジ・インデックス.csv
JPX日経インデックス400.csv
JPX日経インデックス人的資本100.csv
JPX日経中小型株指数.csv
TOPIX (東証株価指数).csv
TOPIX 100.csv
TOPIX 1000.csv
TOPIX 500 グロース.csv
TOPIX 500 バリュー.csv
TOPIX 500.csv
TOPIX Core30.csv
TOPIX Ex-Financials.csv
TOPIX Large70.csv
TOPIX Mid400.csv
TOPIX Small グロース.csv
TOPIX Small バリュー.csv
TOPIX Small.csv
TOPIX Small500.csv
TOPIX グロース.csv
TOPIX バリュー.csv
TOPIX-17 エネルギー資源.csv
TOPIX-17 不動産.csv
TOPIX-17 医薬品.csv
TOPIX-17 商社・卸売.csv
TOPIX-17 小売.csv
TOPIX-17 建設・資材.csv
TOPIX-17 情報通信・サービスその他.csv
TOPIX-17 機械.csv
TOPIX-17 素材・化学.csv
TOPIX-17 自動車･輸送機.csv
TOPIX-17 運輸・物流.csv
TOPIX-17 金融（除く銀行）.csv
TOPIX-17 鉄鋼・非鉄.csv
TOPIX-17 銀行.csv
TOPIX-17 電力・ガス.csv
TOPIX-17 電機・精密.csv
TOPIX-17 食品.csv
その他製品.csv
その他金融業.csv
ガラス・土石製品.csv
ゴム製品.csv
サービス業.csv
ドル円.csv
パルプ・紙.csv
上場時価総額加重TOPIX.csv
不動産業.csv
中型.csv
保険業.csv
倉庫・運輸関連業.csv
化学.csv
医薬品.csv
卸売業.csv
大型.csv
小型.csv
小売業.csv
建設業.csv
情報・通信業.csv
日経半導体株指数.csv
日経平均ボラティリティー・インデックス.csv
日経平均株価.csv
東証REITオフィス指数.csv
東証REIT住宅指数.csv
東証REIT商業・物流等指数.csv
東証REIT指数.csv
東証インフラファンド指数.csv
東証グロース市場250指数.csv
東証グロース市場Core指数.csv
東証グロース市場指数.csv
東証スタンダード市場TOP20.csv
東証スタンダード市場指数.csv
東証プライム市場指数.csv
東証配当フォーカス100指数.csv
機械.csv
水産・農林業.csv
海運業.csv
石油・石炭製品.csv
空運業.csv
精密機器.csv
繊維製品.csv
証券、商品先物取引業.csv
輸送用機器.csv
金属製品.csv
鉄鋼.csv
鉱業.csv
銀行業.csv
陸運業.csv
電気・ガス業.csv
電気機器.csv
非鉄金属.csv
食料品.csv
