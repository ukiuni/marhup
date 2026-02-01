/**
 * グリッド記法パーサー
 */

import type { GridPosition, StyleOptions, AnimationConfig, GridConfig } from '../types/index.js';
import { GridError } from '../errors.js';
import { t } from '../utils/i18n.js';

// グリッド位置パターン: [1-6, 2-8] または [3, 5]
const GRID_PATTERN = /\[(\d+)(?:-(\d+))?,\s*(\d+)(?:-(\d+))?\]/;

// 別名パターン: [title] など
const ALIAS_PATTERN = /\[([a-zA-Z_][a-zA-Z0-9_]*)\]/;

// スタイルパターン: {.class1 .class2 key=value}
const STYLE_PATTERN = /\{([^}]+)\}/;

/**
 * グリッド位置が有効か検証
 */
function validateGridPosition(position: GridPosition, grid: GridConfig): void {
  if (position.colStart < 1 || position.colStart > grid.cols) {
    throw new GridError(
      t('errors.grid.columnStartOutOfRange', { colStart: position.colStart, cols: grid.cols }),
      position,
      t('errors.grid.useColumnNumbers', { cols: grid.cols })
    );
  }
  if (position.colEnd < 1 || position.colEnd > grid.cols) {
    throw new GridError(
      t('errors.grid.columnEndOutOfRange', { colEnd: position.colEnd, cols: grid.cols }),
      position,
      t('errors.grid.useColumnNumbers', { cols: grid.cols })
    );
  }
  if (position.rowStart < 1 || position.rowStart > grid.rows) {
    throw new GridError(
      t('errors.grid.rowStartOutOfRange', { rowStart: position.rowStart, rows: grid.rows }),
      position,
      t('errors.grid.useRowNumbers', { rows: grid.rows })
    );
  }
  if (position.rowEnd < 1 || position.rowEnd > grid.rows) {
    throw new GridError(
      t('errors.grid.rowEndOutOfRange', { rowEnd: position.rowEnd, rows: grid.rows }),
      position,
      t('errors.grid.useRowNumbers', { rows: grid.rows })
    );
  }
  if (position.colStart > position.colEnd) {
    throw new GridError(
      t('errors.grid.columnStartGreaterThanEnd', { colStart: position.colStart, colEnd: position.colEnd }),
      position,
      t('errors.grid.columnStartShouldBeLessThanEnd')
    );
  }
  if (position.rowStart > position.rowEnd) {
    throw new GridError(
      t('errors.grid.rowStartGreaterThanEnd', { rowStart: position.rowStart, rowEnd: position.rowEnd }),
      position,
      t('errors.grid.rowStartShouldBeLessThanEnd')
    );
  }
}

/**
 * アニメーションタイプを標準化
 */
function normalizeAnimationType(type: string): string {
  const typeMap: Record<string, string> = {
    'fade': 'fadein',
    'fly': 'flyin',
    'float': 'floatin',
    'randomBars': 'randombars',
    'growShrink': 'growshrink',
  };
  return typeMap[type] || type;
}
export function extractGridPosition(text: string, aliases?: Record<string, string>, gridConfig?: GridConfig): {
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

    const position: GridPosition = { colStart, colEnd, rowStart, rowEnd };

    // バリデーション
    const grid = gridConfig || { cols: 12, rows: 9 };
    validateGridPosition(position, grid);

    const cleanText = text.replace(GRID_PATTERN, '').trim();

    return {
      position,
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
        return extractGridPosition(tempText, aliases, gridConfig);
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
  let animation: AnimationConfig | undefined;

  // クラスとプロパティを解析
  const parts = styleContent.split(/\s+/);
  for (const part of parts) {
    if (part.startsWith('.')) {
      classes.push(part.slice(1));
    } else if (part.includes('=')) {
      const [key, value] = part.split('=');
      const cleanValue = value.replace(/["']/g, '');
      if (key.startsWith('animation')) {
        // アニメーション関連のプロパティを解析
        if (key === 'animation') {
          animation = { type: normalizeAnimationType(cleanValue) as any };
        } else if (key === 'animation-type') {
          if (!animation) animation = {} as AnimationConfig;
          animation.type = normalizeAnimationType(cleanValue) as any;
        } else if (key === 'animation-duration') {
          if (!animation) animation = {} as AnimationConfig;
          animation.duration = parseFloat(cleanValue) * 1000;
        } else if (key === 'animation-delay') {
          if (!animation) animation = {} as AnimationConfig;
          animation.delay = parseFloat(cleanValue) * 1000;
        } else if (key === 'animation-direction') {
          if (!animation) animation = {} as AnimationConfig;
          animation.direction = cleanValue as any;
        } else if (key === 'animation-trigger') {
          if (!animation) animation = {} as AnimationConfig;
          animation.trigger = cleanValue as any;
        } else if (key === 'animation-repeat') {
          if (!animation) animation = {} as AnimationConfig;
          animation.repeat = parseInt(cleanValue, 10);
        } else if (key === 'animation-speed') {
          if (!animation) animation = {} as AnimationConfig;
          animation.speed = cleanValue as any;
        }
      } else {
        // 一般的なアニメーションプロパティをチェック
        const animationKeys = ['duration', 'delay', 'direction', 'trigger', 'repeat', 'speed'];
        if (animationKeys.includes(key)) {
          if (!animation) animation = {} as AnimationConfig;
          if (key === 'duration' || key === 'delay') {
            (animation as any)[key] = parseFloat(cleanValue) * 1000;
          } else if (key === 'repeat') {
            (animation as any)[key] = parseInt(cleanValue, 10);
          } else {
            (animation as any)[key] = cleanValue;
          }
        } else {
          properties[key] = cleanValue;
        }
      }
    } else if (part.includes(':')) {
      const [key, value] = part.split(':');
      const cleanValue = value.replace(/["']/g, '');
      if (key.startsWith('animation')) {
        // アニメーション関連のプロパティを解析
        if (key === 'animation') {
          animation = { type: normalizeAnimationType(cleanValue) as any };
        } else if (key === 'animation-type') {
          if (!animation) animation = {} as AnimationConfig;
          animation.type = normalizeAnimationType(cleanValue) as any;
        } else if (key === 'animation-duration') {
          if (!animation) animation = {} as AnimationConfig;
          animation.duration = parseFloat(cleanValue) * 1000;
        } else if (key === 'animation-delay') {
          if (!animation) animation = {} as AnimationConfig;
          animation.delay = parseFloat(cleanValue) * 1000;
        } else if (key === 'animation-direction') {
          if (!animation) animation = {} as AnimationConfig;
          animation.direction = cleanValue as any;
        } else if (key === 'animation-trigger') {
          if (!animation) animation = {} as AnimationConfig;
          animation.trigger = cleanValue as any;
        } else if (key === 'animation-repeat') {
          if (!animation) animation = {} as AnimationConfig;
          animation.repeat = parseInt(cleanValue, 10);
        } else if (key === 'animation-speed') {
          if (!animation) animation = {} as AnimationConfig;
          animation.speed = cleanValue as any;
        }
      } else {
        // 一般的なアニメーションプロパティをチェック
        const animationKeys = ['duration', 'delay', 'direction', 'trigger', 'repeat', 'speed'];
        if (animationKeys.includes(key)) {
          if (!animation) animation = {} as AnimationConfig;
          if (key === 'duration' || key === 'delay') {
            (animation as any)[key] = parseFloat(cleanValue) * 1000;
          } else if (key === 'repeat') {
            (animation as any)[key] = parseInt(cleanValue, 10);
          } else {
            (animation as any)[key] = cleanValue;
          }
        } else {
          properties[key] = cleanValue;
        }
      }
    }
  }

  const cleanText = text.replace(STYLE_PATTERN, '').trim();

  const style: StyleOptions = { classes, properties };
  if (animation) {
    style.animation = animation;
  }

  return {
    style,
    cleanText,
  };
}

/**
 * テキストからグリッド位置とスタイルを両方抽出
 */
export function extractGridAndStyle(text: string, aliases?: Record<string, string>, gridConfig?: GridConfig): {
  position: GridPosition | undefined;
  style: StyleOptions | undefined;
  animation: AnimationConfig | undefined;
  cleanText: string;
} {
  // まずグリッド位置を抽出
  const { position, cleanText: afterGrid } = extractGridPosition(text, aliases, gridConfig);
  // 次にスタイルを抽出
  const { style, cleanText: finalText } = extractStyle(afterGrid);

  // アニメーションをスタイルから抽出
  const animation = style?.animation;
  if (style && animation) {
    const { animation: _, ...styleWithoutAnimation } = style;
    return { 
      position, 
      style: Object.keys(styleWithoutAnimation.classes).length > 0 || Object.keys(styleWithoutAnimation.properties).length > 0 ? styleWithoutAnimation : undefined,
      animation,
      cleanText: finalText 
    };
  }

  return { position, style, animation: undefined, cleanText: finalText };
}

/**
 * ブロックの開始行からグリッド位置を抽出（ブロック用）
 * 例: "[1-6, 2-8]" で始まる行
 */
export function parseBlockGridLine(line: string, aliases?: Record<string, string>, gridConfig?: GridConfig): {
  isGridBlock: boolean;
  position: GridPosition | undefined;
  style: StyleOptions | undefined;
} {
  const trimmed = line.trim();

  // 行が [数字 または [文字 で始まるかチェック
  if (!trimmed.match(/^\[[\d[a-zA-Z_]/)) {
    return { isGridBlock: false, position: undefined, style: undefined };
  }

  const { position, cleanText } = extractGridPosition(trimmed, aliases, gridConfig);

  if (!position) {
    return { isGridBlock: false, position: undefined, style: undefined };
  }

  // 残りのテキストからスタイルを抽出
  const { style } = extractStyle(cleanText);

  return { isGridBlock: true, position, style };
}
