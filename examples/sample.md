---
title: marhup サンプルプレゼンテーション
grid: 12x9
theme:
  fonts:
    title: "Times New Roman"
    body: "Georgia"
    code: "Consolas"
aliases:
  title: "[1-12, 1]"
  contents: "[1-12, 2-8]"
  contents_left: "[1-6, 2-8]"
  contents_right: "[7-12, 2-8]"
  footer: "[1-12, 9]"
classes:
  myclass:
    color: '#ff0000'
    bold: true
    fill: { color: '#ffe6e6' }
  another:
    color: '#00aa00'
    fontSize: 18
    italic: true
---

# marhup デモ [title]

グリッドベースレイアウトで PowerPoint を生成 [contents] {.center}

2026年1月 [footer] {.center .small}

---

# 基本的な使い方 [1-12, 1]

[1-6, 2-8]
## シンプルな記法 {animation=appear}
- Markdown をそのまま記述
- グリッド位置は `[列, 行]` で指定
- 省略すれば自動配置

[7-12, 2-8]
## 主な機能 {animation=fade animation-delay=1}
- 12×9 グリッドシステム
- スタイルクラス指定
- 画像・表のサポート
- テーマカスタマイズ

---

# 2カラムレイアウト [1-12, 1]

[contents_left] {.card .blue}
### 課題
- 手作業による入力ミス
- 処理に時間がかかる
- 属人化している

[contents_right] {.card .green}
### 解決策
- 自動バリデーション
- バッチ処理
- マニュアル整備

---

# まとめ [title]

---

# カスタムクラスの例 [title]

[contents_left] {.myclass}
### カスタムスタイル
この要素はカスタムクラス `myclass` を使用しています。

[contents_right] {.another}
### 別のカスタムスタイル
こちらは `another` クラスです。

[footer]
カスタムクラスはFront Matterで定義できます。色、フォントサイズ、装飾などを自由に設定可能です。

---

# スライド遷移の例 [title]
transition:
  type: fade
  duration: 1
  speed: medium

[contents]
## スライド遷移機能
このスライドにはフェードインの遷移効果が設定されています。

### 利用可能な遷移タイプ
- `fade` - フェードイン/アウト
- `push` - 押し出し効果
- `wipe` - ワイプ効果
- `split` - 分割効果
- `cover` - カバー効果
- `uncover` - アンカバー効果
- その他多数

### 設定例
```yaml
transition:
  type: fade
  duration: 1
  direction: left
  speed: medium
```
