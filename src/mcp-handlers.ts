/**
 * MCP ツールハンドラー
 * テスト可能な形でMCPツールのロジックを提供
 */

import * as fs from 'fs';
import * as path from 'path';
import { mashup, mashupFile } from './index.js';

export interface ToolResult {
  content: { type: string; text: string }[];
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * 利用可能なツール一覧を取得
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'convert_markdown_to_pptx',
      description:
        'Markdownテキストをグリッドベースのレイアウトで PowerPoint (PPTX) ファイルに変換します。グリッド座標 [列開始-列終了, 行開始-行終了] を使って要素を配置できます。',
      inputSchema: {
        type: 'object',
        properties: {
          markdown: {
            type: 'string',
            description:
              'PowerPointに変換するMarkdownテキスト。グリッド記法 [1-12, 1] でレイアウトを指定できます。',
          },
          outputPath: {
            type: 'string',
            description: '出力するPPTXファイルのパス（例: /path/to/output.pptx）',
          },
          basePath: {
            type: 'string',
            description:
              '画像などの相対パスを解決する際の基準ディレクトリ（省略時はカレントディレクトリ）',
          },
        },
        required: ['markdown', 'outputPath'],
      },
    },
    {
      name: 'convert_file_to_pptx',
      description:
        'MarkdownファイルをPowerPoint (PPTX) ファイルに変換します。ファイル内の画像パスは入力ファイルからの相対パスとして解決されます。',
      inputSchema: {
        type: 'object',
        properties: {
          inputPath: {
            type: 'string',
            description: '変換するMarkdownファイルのパス',
          },
          outputPath: {
            type: 'string',
            description: '出力するPPTXファイルのパス（例: /path/to/output.pptx）',
          },
        },
        required: ['inputPath', 'outputPath'],
      },
    },
    {
      name: 'get_mashup_guide',
      description:
        'mashup用のMarkdown記法ガイドを取得します。グリッドレイアウトやスタイル指定の方法を確認できます。',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}

/**
 * Markdownテキストから記法ガイドを生成
 */
export function getMashupGuide(): string {
  return `# mashup Markdown記法ガイド

## 基本構造

\`\`\`markdown
---
title: プレゼンテーションタイトル
grid: 12x9
---

# スライド1タイトル [1-12, 1]

コンテンツ...

---

# スライド2タイトル [1-12, 1]

コンテンツ...
\`\`\`

## グリッド座標系

- **列**: 1〜12（左→右）
- **行**: 1〜9（上→下）
- **記法**: \`[列開始-列終了, 行開始-行終了]\`

例:
- \`[1-12, 1]\` - 全幅、1行目
- \`[1-6, 2-5]\` - 左半分、2〜5行目
- \`[7-12, 2-5]\` - 右半分、2〜5行目

## 要素の配置

### 見出し
\`\`\`markdown
# 大見出し [1-12, 1]
## 中見出し [1-6, 2]
\`\`\`

### テキスト
\`\`\`markdown
説明文をここに書きます [1-12, 3-4]
\`\`\`

### リスト
\`\`\`markdown
[1-6, 2-5]
- 項目1
- 項目2
- 項目3
\`\`\`

### 画像
\`\`\`markdown
![代替テキスト](image.png) [7-12, 2-5]
\`\`\`

### テーブル
\`\`\`markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A   | B   | C   |
\`\`\`

## スタイルクラス

位置指定の後に \`{.クラス名}\` で指定:

\`\`\`markdown
# タイトル [1-12, 1] {.center}
\`\`\`

主要クラス:
- \`.center\` - 中央揃え
- \`.right\` - 右揃え
- \`.small\` - 小さいフォント
- \`.footer\` - フッター用
- \`.gray\` - グレー文字

## Mermaid図

Mermaid記法で図を描くと自動的に画像に変換されます:

\`\`\`markdown
[1-6, 2-8]
\\\`\\\`\\\`mermaid
graph TD
    A[開始] --> B[処理]
    B --> C[終了]
\\\`\\\`\\\`
\`\`\`

対応図形: flowchart, sequence, class, state, ER図など`;
}

/**
 * ツールを実行
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'convert_markdown_to_pptx': {
        const { markdown, outputPath, basePath } = args as {
          markdown: string;
          outputPath: string;
          basePath?: string;
        };

        if (!markdown || !outputPath) {
          throw new Error('markdown と outputPath は必須パラメータです');
        }

        // 出力ディレクトリが存在しない場合は作成
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        await mashup(markdown, {
          output: outputPath,
          basePath: basePath || process.cwd(),
        });

        return {
          content: [
            {
              type: 'text',
              text: `PowerPointファイルを生成しました: ${outputPath}`,
            },
          ],
        };
      }

      case 'convert_file_to_pptx': {
        const { inputPath, outputPath } = args as {
          inputPath: string;
          outputPath: string;
        };

        if (!inputPath || !outputPath) {
          throw new Error('inputPath と outputPath は必須パラメータです');
        }

        if (!fs.existsSync(inputPath)) {
          throw new Error(`入力ファイルが見つかりません: ${inputPath}`);
        }

        // 出力ディレクトリが存在しない場合は作成
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        await mashupFile(inputPath, { output: outputPath });

        return {
          content: [
            {
              type: 'text',
              text: `PowerPointファイルを生成しました: ${outputPath}\n入力: ${inputPath}`,
            },
          ],
        };
      }

      case 'get_mashup_guide': {
        return {
          content: [
            {
              type: 'text',
              text: getMashupGuide(),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `エラー: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
