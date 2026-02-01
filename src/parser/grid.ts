/**
 * グリッド記法パーサー
 */

import type { GridPosition, StyleOptions } from '../types/index';

// グリッド位置パターン: [1-6, 2-8] または [3, 5]
const GRID_PATTERN = /\[(\d+)(?:-(\d+))?,\s*(\d+)(?:-(\d+))?\]/;

// 別名パターン: [title] など
const ALIAS_PATTERN = /\[([a-zA-Z_][a-zA-Z0-9_]*)\]/;

// スタイルパターン: {.class1 .class2 key=value}
const STYLE_PATTERN = /\{([^}]+)\}/;

/**
 * 行からグリッド位置を抽出
 */
export function extractGridPosition(text: string, aliases?: Record<string, string>): {
  position: GridPosition | undefined;
  cleanText: string;
} {
  // まずグリッドパターンをチェック
  let match = text.match(GRID_PATTERN);

  if (match) {
    const colStart = parseInt(match[1], 10);
    const colEnd = match[2] ? parseInt(match[2], 10) : colStart;
    const rowStart = parseInt(match[3], 10);
    const rowEnd = match[4] ? parseInt(match[4], 10) : rowStart;

    const cleanText = text.replace(GRID_PATTERN, '').trim();

    return {
      position: { colStart, colEnd, rowStart, rowEnd },
      cleanText,
    };
  }

  // 次に別名パターンをチェック
  if (aliases) {
    match = text.match(ALIAS_PATTERN);
    if (match) {
      const alias = match[1];
      const gridStr = aliases[alias];
      if (gridStr) {
        // 別名をグリッド文字列に置き換えて再帰的にパース
        const tempText = text.replace(ALIAS_PATTERN, gridStr);
        return extractGridPosition(tempText, aliases);
      }
    }
  }

  return { position: undefined, cleanText: text };
}

/**
 * 行からスタイルを抽出
 */
export function extractStyle(text: string): {
  style: StyleOptions | undefined;
  cleanText: string;
} {
  const match = text.match(STYLE_PATTERN);

  if (!match) {
    return { style: undefined, cleanText: text };
  }

  const styleContent = match[1];
  const classes: string[] = [];
  const properties: Record<string, string> = {};

  // クラスとプロパティを解析
  const parts = styleContent.split(/\s+/);
  for (const part of parts) {
    if (part.startsWith('.')) {
      classes.push(part.slice(1));
    } else if (part.includes('=')) {
      const [key, value] = part.split('=');
      properties[key] = value.replace(/["']/g, '');
    } else if (part.includes(':')) {
      const [key, value] = part.split(':');
      properties[key] = value.replace(/["']/g, '');
    }
  }

  const cleanText = text.replace(STYLE_PATTERN, '').trim();

  return {
    style: { classes, properties },
    cleanText,
  };
}

/**
 * テキストからグリッド位置とスタイルを両方抽出
 */
export function extractGridAndStyle(text: string, aliases?: Record<string, string>): {
  position: GridPosition | undefined;
  style: StyleOptions | undefined;
  cleanText: string;
} {
  // まずグリッド位置を抽出
  const { position, cleanText: afterGrid } = extractGridPosition(text, aliases);
  // 次にスタイルを抽出
  const { style, cleanText: finalText } = extractStyle(afterGrid);

  return { position, style, cleanText: finalText };
}

/**
 * ブロックの開始行からグリッド位置を抽出（ブロック用）
 * 例: "[1-6, 2-8]" で始まる行
 */
export function parseBlockGridLine(line: string, aliases?: Record<string, string>): {
  isGridBlock: boolean;
  position: GridPosition | undefined;
  style: StyleOptions | undefined;
} {
  const trimmed = line.trim();

  // 行が [数字 または [文字 で始まるかチェック
  if (!trimmed.match(/^\[[\d[a-zA-Z_]/)) {
    return { isGridBlock: false, position: undefined, style: undefined };
  }

  const { position, cleanText } = extractGridPosition(trimmed, aliases);

  if (!position) {
    return { isGridBlock: false, position: undefined, style: undefined };
  }

  // 残りのテキストからスタイルを抽出
  const { style } = extractStyle(cleanText);

  return { isGridBlock: true, position, style };
}
