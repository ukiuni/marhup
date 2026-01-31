/**
 * 自動配置ロジック
 */

import type { SlideElement, GridConfig, GridPosition, DEFAULT_ELEMENT_HEIGHT } from '../types/index.js';
import type { GridMap, PlacedElement } from './types.js';

// 要素タイプごとのデフォルト高さ
const ELEMENT_HEIGHT: Record<string, number> = {
  heading: 1,
  paragraph: 2,
  list: 3,
  image: 4,
  table: 3,
  code: 3,
  blockquote: 2,
};

/**
 * 空のグリッドマップを作成
 */
export function createEmptyGridMap(cols: number, rows: number): GridMap {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ occupied: false }))
  );
}

/**
 * グリッドマップに要素を配置
 */
export function placeOnGrid(
  gridMap: GridMap,
  position: GridPosition,
  elementIndex: number
): void {
  for (let row = position.rowStart - 1; row < position.rowEnd; row++) {
    for (let col = position.colStart - 1; col < position.colEnd; col++) {
      if (row >= 0 && row < gridMap.length && col >= 0 && col < gridMap[0].length) {
        gridMap[row][col] = { occupied: true, elementIndex };
      }
    }
  }
}

/**
 * 指定位置が空いているかチェック
 */
export function isAreaAvailable(
  gridMap: GridMap,
  position: GridPosition
): boolean {
  for (let row = position.rowStart - 1; row < position.rowEnd; row++) {
    for (let col = position.colStart - 1; col < position.colEnd; col++) {
      if (row < 0 || row >= gridMap.length || col < 0 || col >= gridMap[0].length) {
        return false;
      }
      if (gridMap[row][col].occupied) {
        return false;
      }
    }
  }
  return true;
}

/**
 * 要素の高さを推定
 */
export function estimateElementHeight(element: SlideElement): number {
  const baseHeight = ELEMENT_HEIGHT[element.type] || 2;

  // リストの場合、アイテム数に応じて調整
  if (element.type === 'list' && Array.isArray(element.content)) {
    const itemCount = element.content.length;
    return Math.min(Math.ceil(itemCount / 2) + 1, 6);
  }

  // テーブルの場合、行数に応じて調整
  if (element.type === 'table' && typeof element.content === 'object' && 'rows' in element.content) {
    const rowCount = element.content.rows.length + 1; // ヘッダー含む
    return Math.min(rowCount, 6);
  }

  return baseHeight;
}

/**
 * 利用可能な位置を検索
 */
export function findAvailablePosition(
  gridMap: GridMap,
  startRow: number,
  height: number,
  grid: GridConfig
): GridPosition | null {
  const { cols, rows } = grid;

  // 指定行から下に向かって探索
  for (let row = startRow; row <= rows - height + 1; row++) {
    const position: GridPosition = {
      colStart: 1,
      colEnd: cols,
      rowStart: row,
      rowEnd: row + height - 1,
    };

    if (isAreaAvailable(gridMap, position)) {
      return position;
    }
  }

  // 見つからなければ、高さを縮めて再試行
  if (height > 1) {
    return findAvailablePosition(gridMap, startRow, height - 1, grid);
  }

  return null;
}

/**
 * 要素を自動配置
 */
export function autoPlaceElements(
  elements: SlideElement[],
  grid: GridConfig
): PlacedElement[] {
  const gridMap = createEmptyGridMap(grid.cols, grid.rows);
  const placed: PlacedElement[] = [];
  let currentRow = 1;

  // まず、明示的に位置指定された要素を配置
  const explicitElements = elements.filter((e) => e.position);
  const implicitElements = elements.filter((e) => !e.position);

  for (let i = 0; i < explicitElements.length; i++) {
    const element = explicitElements[i];
    placeOnGrid(gridMap, element.position!, placed.length);
    placed.push({
      type: element.type,
      content: element.content,
      level: element.level,
      position: element.position!,
      style: element.style,
      raw: element.raw,
    });
  }

  // 次に、位置未指定の要素を自動配置
  for (const element of implicitElements) {
    const height = estimateElementHeight(element);
    const position = findAvailablePosition(gridMap, currentRow, height, grid);

    if (position) {
      placeOnGrid(gridMap, position, placed.length);
      placed.push({
        type: element.type,
        content: element.content,
        level: element.level,
        position,
        style: element.style,
        raw: element.raw,
      });
      currentRow = position.rowEnd + 1;
    } else {
      // 配置できない場合は最後に追加（はみ出す可能性あり）
      console.warn('要素を配置できませんでした:', element.type);
      placed.push({
        type: element.type,
        content: element.content,
        level: element.level,
        position: {
          colStart: 1,
          colEnd: grid.cols,
          rowStart: currentRow,
          rowEnd: currentRow + height - 1,
        },
        style: element.style,
        raw: element.raw,
      });
      currentRow += height;
    }
  }

  return placed;
}
