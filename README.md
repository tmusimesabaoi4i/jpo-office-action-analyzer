# jpo-office-action-analyzer
Parse and analyze JPO Office Actions (rejection notices) into structured tables, CSV copy, and A4 print-ready reports.

# 拒絶理由通知 分析ツール

拒絶理由通知のテキストを貼り付けて、理由別・請求項別に整理するブラウザアプリです。

## 機能

- **引用文献一覧の抽出** … 引用文献等一覧から番号と文献名を取得
- **理由ブロックの解析** … 理由1（進歩性）／理由2（サポート要件）などのブロック単位で解析
- **新規性・進歩性（29条）** … 請求項・条文・引用文献・段落・図の対応を表形式で表示
- **その他理由（36条など）** … サポート要件・明確性など理由別に表示
- **空いている請求項** … 拒絶の理由を発見しない請求項の抽出（明示／推論）
- **段落・図の引用文献別付与** … 引用文献1／2／3ごとに段落・FIGを紐付け
- **CSVコピー** … 各セクションをExcel互換CSVでクリップボードにコピー
- **印刷（A4）** … Ctrl/Cmd + Shift + P でA4レイアウトの印刷用ウィンドウを開く

## 必要な環境

- モダンなブラウザ（Chrome / Edge / Firefox / Safari など）
- テスト実行時: Node.js と Python 3

## 使い方

1. `project/index.html` をブラウザで開く（またはローカルサーバで `project/` を配信）
2. 拒絶理由通知の本文を入力欄に貼り付け
3. **解析** ボタンをクリック、または **Ctrl/Cmd + Enter** で解析
4. 必要に応じて **CSVコピー** でExcelに貼り付け、**Ctrl/Cmd + Shift + P** で印刷ダイアログを開く

### キーボードショートカット

| 操作           | Windows      | Mac            |
|----------------|--------------|----------------|
| 解析           | Ctrl + Enter | Cmd + Enter    |
| 印刷ダイアログ | Ctrl + Shift + P | Cmd + Shift + P |

## プロジェクト構成

```
.
├── README.md
├── test_runner.py      # テスト実行（Python 起点）
├── run_tests.js        # Node 用 JS テストスイート
├── test_log.txt        # テスト実行ログ（自動生成）
├── test_data.txt       # サンプル入力データ
└── project/
    ├── index.html      # メイン画面
    ├── style.css
    ├── test.html       # ユニットテスト用
    ├── test_integration.html
    └── js/
        ├── namespace.js
        ├── utils.js
        ├── paragraph_ref_set.js
        ├── rejection_parser.js
        ├── rejection_analyzer.js
        ├── ascii_table.js
        ├── io.js        # CSV / 印刷 / クリップボード
        └── app.js       # UI コントローラ
```

## テスト

JS のテストは **Python 経由** で実行します。

```bash
python test_runner.py
```

- Node.js の有無を確認してから `node run_tests.js` を実行
- 結果は `test_log.txt` に保存
- 失敗時は終了コード 1 で終了

## ライセンス

（ここにライセンスを記載してください）
