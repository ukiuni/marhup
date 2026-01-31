# md2ppt 仕様書

## 1. 概要

md2pptは、Markdownファイルからグリッドベースのレイアウト指定でPowerPoint (PPTX) を生成するCLIツールです。

### 1.1 主な機能

- 12×9グリッドシステムによる直感的な位置指定
- 標準Markdown記法との完全互換
- スタイルクラスによる柔軟なスタイリング
- 位置指定省略時の自動レイアウト
- 監視モードによる自動再生成

## 2. 入力仕様

### 2.1 Markdownファイル形式

入力ファイルは標準のMarkdown形式に、以下の拡張記法を加えたものです。

### 2.2 スライド区切り

`---`（3つのハイフン）でスライドを区切ります。改行を挟む必要があります。

```markdown
# スライド1

内容...

---

# スライド2

内容...
```

### 2.3 Front Matter

ファイル先頭または各スライド先頭にYAML形式のメタデータを記述できます。

```yaml
---
title: プレゼンテーションタイトル
grid: 12x9
theme: default
layout: プリセット名
---
```

| プロパティ | 型 | 説明 | デフォルト |
|-----------|-----|------|-----------|
| `title` | string | ドキュメント/スライドタイトル | なし |
| `grid` | string | グリッドサイズ（`列x行`形式） | `12x9` |
| `theme` | string | テーマ名 | `default` |
| `layout` | string | プリセットレイアウト名 | なし |

### 2.4 グリッド位置指定記法

#### 2.4.1 基本形式

`[列, 行]` 形式で要素の位置を指定します。

| 記法 | 説明 | 例 |
|------|------|-----|
| `[列, 行]` | 1セル指定 | `[1, 1]` |
| `[列1-列2, 行]` | 列の範囲指定 | `[1-6, 1]` |
| `[列, 行1-行2]` | 行の範囲指定 | `[1, 1-3]` |
| `[列1-列2, 行1-行2]` | 矩形範囲指定 | `[1-6, 2-8]` |

#### 2.4.2 グリッド座標系

- **列**: 1〜12（左から右）
- **行**: 1〜9（上から下）
- 座標は1始まり（1-indexed）

```
     1   2   3   4   5   6   7   8   9  10  11  12
   ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
 1 │                     [1-12, 1]                  │
   ├───┴───┴───┬───┴───┴───┴───┴───┴───┼───┴───┴───┤
 2 │           │                       │           │
 3 │  [1-3,    │      [4-9, 2-5]       │ [10-12,   │
 4 │   2-5]    │                       │   2-5]    │
 5 │           │                       │           │
   ├───────────┴───────────────────────┴───────────┤
 6 │                                               │
 7 │                  [1-12, 6-9]                  │
 8 │                                               │
 9 │                                               │
   └───────────────────────────────────────────────┘
```

#### 2.4.3 インライン位置指定

見出しや段落の末尾に直接指定できます。

```markdown
# タイトル [1-12, 1]
本文テキスト [1-6, 2-4]
```

#### 2.4.4 ブロック位置指定

行頭に位置指定を記述し、その後の内容全体に適用します。

```markdown
[1-6, 2-8]
## 見出し
- 項目1
- 項目2

[7-12, 2-8]
右側のコンテンツ
```

### 2.5 スタイル指定記法

`{.クラス名}` 形式でスタイルを指定します。複数指定可能。

```markdown
# タイトル [1-12, 1] {.center}
テキスト {.red .bold}
```

#### 2.5.1 組み込みスタイルクラス

| カテゴリ | クラス | 説明 |
|---------|--------|------|
| **配置** | `.center` | 水平・垂直中央揃え |
| | `.left` | 左揃え |
| | `.right` | 右揃え |
| **テキスト色** | `.red` | 赤色 (#dc2626) |
| | `.blue` | 青色 (#2563eb) |
| | `.green` | 緑色 (#16a34a) |
| | `.gray` | グレー (#6b7280) |
| | `.orange` | オレンジ (#ea580c) |
| | `.purple` | 紫色 (#9333ea) |
| **背景色** | `.bg-red` | 赤背景 (#fef2f2) |
| | `.bg-blue` | 青背景 (#eff6ff) |
| | `.bg-green` | 緑背景 (#f0fdf4) |
| | `.bg-gray` | グレー背景 (#f9fafb) |
| **サイズ** | `.small` | 小フォント (14pt) |
| | `.large` | 大フォント (24pt) |
| **装飾** | `.bold` | 太字 |
| | `.highlight` | ハイライト背景 (#fef3c7) |
| | `.card` | カード風背景・枠線 |
| **特殊** | `.header` | ヘッダー領域スタイル |
| | `.footer` | フッター領域スタイル |
| | `.note` | 注釈スタイル |

#### 2.5.2 カスタムプロパティ

`key=value` または `key:value` 形式でカスタムプロパティを指定できます。

```markdown
{.center bg=#f0f0f0}
```

### 2.6 対応Markdown要素

| 要素タイプ | Markdown記法 | 対応状況 |
|-----------|-------------|---------|
| 見出し | `#`, `##`, `###`, ... | ✅ |
| 段落 | テキスト | ✅ |
| 順序なしリスト | `-`, `*` | ✅ |
| 順序付きリスト | `1.`, `2.`, ... | ✅ |
| 画像 | `![alt](path)` | ✅ |
| テーブル | `\| ... \|` | ✅ |
| コードブロック | ` ``` ` | ✅ |
| 引用 | `>` | ✅ |
| 太字 | `**text**` | ✅ |
| 斜体 | `*text*` | ✅ |
| リンク | `[text](url)` | ✅ |

## 3. 出力仕様

### 3.1 PPTXファイル形式

- **フォーマット**: Office Open XML (.pptx)
- **スライドサイズ**: 16:9 (10" × 5.625")
- **マージン**: 0.5インチ（上下左右）

### 3.2 座標変換

グリッド位置は以下の式でスライド座標（インチ）に変換されます。

```
contentWidth = slideWidth - margin * 2 = 9インチ
contentHeight = slideHeight - margin * 2 = 4.625インチ

cellWidth = contentWidth / gridCols
cellHeight = contentHeight / gridRows

x = margin + (colStart - 1) * cellWidth
y = margin + (rowStart - 1) * cellHeight
w = (colEnd - colStart + 1) * cellWidth
h = (rowEnd - rowStart + 1) * cellHeight
```

## 4. 自動配置アルゴリズム

### 4.1 配置ルール

位置が明示されていない要素は、以下のルールで自動配置されます。

1. 明示的に位置指定された要素を先に配置
2. 位置未指定の要素を上から順に配置
3. 全幅（colStart=1, colEnd=12）を使用
4. 衝突する領域は避けて配置

### 4.2 要素タイプ別デフォルト高さ

| 要素タイプ | デフォルト高さ（行数） |
|-----------|---------------------|
| heading | 1 |
| paragraph | 2 |
| list | 3（アイテム数により調整） |
| image | 4 |
| table | 3（行数により調整） |
| code | 3 |
| blockquote | 2 |

### 4.3 動的高さ調整

- **リスト**: `min(ceil(itemCount / 2) + 1, 6)`
- **テーブル**: `min(rowCount + 1, 6)`

## 5. テーマ仕様

### 5.1 デフォルトテーマ

```typescript
{
  name: 'default',
  colors: {
    primary: '#2563eb',     // 青
    secondary: '#64748b',   // グレー
    accent: '#f59e0b',      // オレンジ
    background: '#ffffff',  // 白
    text: '#1e293b',        // ダークグレー
  },
  fonts: {
    title: 'Arial',
    body: 'Arial',
    code: 'Courier New',
  },
  fontSize: {
    h1: 36,
    h2: 28,
    h3: 24,
    body: 18,
    small: 14,
  }
}
```

## 6. CLI仕様

### 6.1 コマンド構文

```
md2ppt [options] <input>
```

### 6.2 引数

| 引数 | 説明 |
|------|------|
| `<input>` | 入力Markdownファイルのパス（必須） |

### 6.3 オプション

| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|-----------|
| `--output <file>` | `-o` | 出力ファイル名 | `output.pptx` |
| `--theme <name>` | `-t` | テーマ名 | `default` |
| `--watch` | `-w` | 監視モード（変更時自動再生成） | `false` |
| `--grid <size>` | | デフォルトグリッドサイズ | `12x9` |
| `--version` | `-v` | バージョン表示 | |
| `--help` | `-h` | ヘルプ表示 | |

### 6.4 使用例

```bash
# 基本的な変換
md2ppt input.md -o output.pptx

# テーマを指定
md2ppt input.md -o output.pptx --theme corporate

# 監視モード
md2ppt input.md -o output.pptx --watch
```

## 7. プログラムAPI仕様

### 7.1 メイン関数

```typescript
// Markdown文字列からPPTX生成
function md2ppt(markdown: string, options: ConvertOptions): Promise<void>

// ファイルからPPTX生成
function md2pptFile(inputPath: string, options: ConvertOptions): Promise<void>
```

### 7.2 ConvertOptions型

```typescript
interface ConvertOptions {
  output: string;       // 出力ファイルパス（必須）
  theme?: string;       // テーマ名
  grid?: string;        // デフォルトグリッドサイズ
  watch?: boolean;      // 監視モード
  basePath?: string;    // 画像相対パス解決用
}
```

## 8. 型定義

### 8.1 GridPosition

```typescript
interface GridPosition {
  colStart: number;  // 列開始（1-12）
  colEnd: number;    // 列終了（1-12）
  rowStart: number;  // 行開始（1-9）
  rowEnd: number;    // 行終了（1-9）
}
```

### 8.2 StyleOptions

```typescript
interface StyleOptions {
  classes: string[];                    // スタイルクラス名
  properties: Record<string, string>;   // カスタムプロパティ
}
```

### 8.3 SlideElement

```typescript
interface SlideElement {
  type: 'heading' | 'paragraph' | 'list' | 'image' | 'table' | 'code' | 'blockquote';
  content: string | ListItem[] | TableData;
  level?: number;           // 見出しレベル（h1=1, h2=2, ...）
  position?: GridPosition;  // 省略時は自動配置
  style?: StyleOptions;     // 省略時はデフォルト
  raw?: string;             // 元のMarkdown
}
```

### 8.4 Slide

```typescript
interface Slide {
  frontmatter: SlideFrontmatter;
  elements: SlideElement[];
}
```

### 8.5 ParsedDocument

```typescript
interface ParsedDocument {
  globalFrontmatter: SlideFrontmatter;
  slides: Slide[];
}
```

### 8.6 ListItem

```typescript
interface ListItem {
  content: string;
  level: number;
  ordered: boolean;
  children?: ListItem[];
}
```

### 8.7 TableData

```typescript
interface TableData {
  headers: string[];
  rows: string[][];
}
```

## 9. 正規表現パターン

### 9.1 グリッド位置パターン

```typescript
// [1-6, 2-8] または [3, 5] にマッチ
const GRID_PATTERN = /\[(\d+)(?:-(\d+))?,\s*(\d+)(?:-(\d+))?\]/;
```

### 9.2 スタイルパターン

```typescript
// {.class1 .class2 key=value} にマッチ
const STYLE_PATTERN = /\{([^}]+)\}/;
```

## 10. エラーハンドリング

### 10.1 入力検証エラー

- ファイルが見つからない場合: エラーメッセージを表示して終了コード1
- 不正なグリッド指定: 警告を出力し、要素をスキップまたはデフォルト位置に配置

### 10.2 エラーメッセージ言語

- エラーメッセージは日本語で出力

## 11. 制限事項

### 11.1 現在の制限

- カスタムテーマファイルの読み込みは未実装
- アニメーション指定は未サポート
- ネストされたリストは2階層まで

### 11.2 今後の拡張予定

- テーマファイル（YAML）の読み込み
- プリセットレイアウトの追加
- アニメーション指定
- VSCode拡張との連携
- Webブラウザ版

## 12. サンプル

### 12.1 最小構成

```markdown
# タイトル

本文テキスト
```

### 12.2 2カラムレイアウト

```markdown
---
grid: 12x9
---

# 2カラムレイアウト [1-12, 1]

[1-6, 2-8]
## 左側
- 項目1
- 項目2

[7-12, 2-8]
## 右側
テキスト
```

### 12.3 ダッシュボード

```markdown
---
grid: 12x9
---

# KPIダッシュボード [1-12, 1]

[1-3, 2-4] {.card .blue}
### 売上
**¥128M**

[4-6, 2-4] {.card .green}
### 利益
**¥32M**

[7-12, 2-9]
![グラフ](./chart.png)
```

## 13. 依存関係

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| pptxgenjs | 3.x | PPTX生成 |
| marked | 11.x | Markdownパース |
| yaml | 2.x | Front Matterパース |
| commander | 12.x | CLIフレームワーク |
| vitest | 1.x | テストフレームワーク |
| typescript | 5.x | 言語 |

---

*このドキュメントはmd2ppt v0.1.0の仕様を記述しています。*
