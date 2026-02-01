# AGENTS.md - marhup 開発ガイド

## プロジェクト概要

`marhup` は、Markdownファイルからグリッドベースのレイアウト指定でPowerPoint (PPTX) を生成するCLIツールです。

## 技術スタック

| カテゴリ | 技術 | バージョン |
|----------|------|-----------|
| 言語 | TypeScript | 5.x |
| ランタイム | Node.js | 20.x LTS |
| PPTX生成 | pptxgenjs | 3.x |
| MDパース | marked | 11.x |
| YAML解析 | yaml | 2.x |
| CLI | commander | 12.x |
| テスト | vitest | 1.x |

## ディレクトリ構造

```
marhup/
├── src/
│   ├── index.ts           # CLIエントリーポイント
│   ├── parser/
│   │   ├── markdown.ts    # Markdownパーサー
│   │   ├── frontmatter.ts # YAML Front Matter解析
│   │   └── grid.ts        # グリッド記法解析
│   ├── layout/
│   │   ├── engine.ts      # レイアウトエンジン
│   │   ├── auto.ts        # 自動配置ロジック
│   │   └── types.ts       # レイアウト型定義
│   ├── generator/
│   │   ├── pptx.ts        # PPTX生成メイン
│   │   ├── slide.ts       # スライド生成
│   │   ├── text.ts        # テキスト要素生成
│   │   ├── image.ts       # 画像要素生成
│   │   └── table.ts       # 表要素生成
│   ├── theme/
│   │   ├── default.ts     # デフォルトテーマ
│   │   └── types.ts       # テーマ型定義
│   └── types/
│       └── index.ts       # 共通型定義
├── tests/
│   ├── parser/
│   ├── layout/
│   └── generator/
├── examples/              # サンプルMDファイル
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
└── AGENTS.md
```

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI (src/index.ts)                       │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Parser Layer                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ frontmatter │ │  markdown   │ │    grid     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Layout Engine                              │
│  - グリッド計算                                              │
│  - 自動配置                                                  │
│  - 衝突検出                                                  │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  PPTX Generator                             │
│  - pptxgenjs を使用                                         │
│  - 各要素タイプ別の生成処理                                   │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
                    output.pptx
```

## 主要な型定義

### SlideElement（スライド要素）

```typescript
interface SlideElement {
  type: 'heading' | 'paragraph' | 'list' | 'image' | 'table' | 'code';
  content: string | ListItem[] | TableData;
  position?: GridPosition;  // 省略時は自動配置
  style?: StyleOptions;     // 省略時はデフォルト
}

interface GridPosition {
  colStart: number;  // 1-12
  colEnd: number;    // 1-12
  rowStart: number;  // 1-9
  rowEnd: number;    // 1-9
}
```

### Slide（スライド）

```typescript
interface Slide {
  frontmatter: SlideFrontmatter;
  elements: SlideElement[];
}

interface SlideFrontmatter {
  title?: string;
  grid?: string;      // "12x9" 形式
  layout?: string;    // プリセット名
  theme?: string;
}
```

## グリッド記法の解析

### 正規表現パターン

```typescript
// グリッド位置: [1-6, 2-8] または [3, 5]
const GRID_PATTERN = /\[(\d+)(?:-(\d+))?,\s*(\d+)(?:-(\d+))?\]/;

// スタイル: {.class1 .class2 key=value}
const STYLE_PATTERN = /\{([^}]+)\}/;
```

### パース例

```
入力: "# タイトル [1-12, 1] {.center}"

結果:
{
  type: 'heading',
  level: 1,
  content: 'タイトル',
  position: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 1 },
  style: { classes: ['center'] }
}
```

## 自動配置アルゴリズム

1. 明示的に位置指定された要素を先に配置
2. 位置未指定の要素を上から順に配置
3. 各要素タイプに応じたデフォルト高さを使用
4. 衝突する領域は避けて配置

```typescript
function autoPlace(elements: SlideElement[], grid: Grid): PlacedElement[] {
  const placed: PlacedElement[] = [];
  let currentRow = 1;
  
  // 明示的配置を先に処理
  const explicit = elements.filter(e => e.position);
  const implicit = elements.filter(e => !e.position);
  
  placed.push(...explicit.map(e => ({ ...e, position: e.position! })));
  
  // 自動配置
  for (const element of implicit) {
    const height = estimateHeight(element);
    const position = findAvailableSpace(placed, currentRow, height, grid);
    placed.push({ ...element, position });
    currentRow = position.rowEnd + 1;
  }
  
  return placed;
}
```

## 開発コマンド

```bash
# 依存関係インストール
npm install

# 開発モード（watchモード）
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# テスト（watchモード）
npm run test:watch

# 型チェック
npm run typecheck

# リント
npm run lint

# サンプル実行
npm run example
```

## テスト方針

1. **パーサーテスト**: 各記法の解析が正しく行われるか
2. **レイアウトテスト**: 自動配置ロジックの検証
3. **統合テスト**: MD → PPTX の変換が正しく行われるか
4. **スナップショットテスト**: 生成結果の回帰テスト

## コーディング規約

- ESLint + Prettier を使用
- 関数型アプローチを優先（副作用を最小化）
- 型は可能な限り厳密に定義
- エラーメッセージは日本語で分かりやすく

## 開発プロセス

### 機能追加時のチェックリスト

新しく機能を追加した場合は、以下のドキュメントも確認・メンテナンスしてください：

1. **README.md**: 機能の説明、記法ガイド、使用例を追加
2. **MCPハンドラー**: `getMarhupGuide()` 関数で生成されるガイドに機能を追加
3. **AGENTS.md**: この開発ガイドに機能の説明を追加（必要に応じて）
4. **サンプルファイル**: `examples/sample.md` を更新して新機能をデモ
5. **テスト**: 新機能の動作を検証するテストを追加

### ドキュメント更新の重要性

- ユーザーが新機能をすぐに使えるようになる
- MCP経由でAIアシスタントが正確な情報を提供できる
- 開発チーム内の知識共有が促進される
- 回帰テストの役割も果たす

## 今後の拡張予定

- [ ] テーマファイル（YAML）の読み込み
- [ ] プリセットレイアウトの追加
- [ ] アニメーション指定
- [ ] VSCode拡張との連携
- [ ] Webブラウザ版
