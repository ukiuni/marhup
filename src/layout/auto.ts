/**
 * 自動配置ロジック
 */

import type { SlideElement, GridConfig, GridPosition } from '../types/index.js';
import type { GridMap, PlacedElement } from './types.js';
import { GridError } from '../errors.js';
import { t } from '../utils/i18n.js';

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

// 要素タイプごとのデフォルト幅（グリッド列数に対する割合）
const ELEMENT_WIDTH_RATIO: Record<string, number> = {
  heading: 1.0, // フル幅
  paragraph: 1.0,
  list: 0.75, // 3/4幅
  image: 0.5, // 半幅
  table: 1.0,
  code: 0.8, // 4/5幅
  blockquote: 0.6, // 3/5幅
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
 * グリッド位置が有効か検証
 */
export function validateGridPosition(position: GridPosition, grid: GridConfig): void {
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
 * 要素の幅を推定
 */
export function estimateElementWidth(element: SlideElement, gridCols: number): number {
  const ratio = ELEMENT_WIDTH_RATIO[element.type] || 1.0;
  return Math.max(1, Math.floor(gridCols * ratio));
}

/**
 * 利用可能な位置を検索（古いバージョン、フル幅のみ）
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

  return null;
}

/**
 * 最適な利用可能な位置を検索（幅と高さを指定）
 */
export function findBestAvailablePosition(
  gridMap: GridMap,
  width: number,
  height: number,
  grid: GridConfig
): GridPosition | null {
  const { cols, rows } = grid;

  // グリッド全体を左上からスキャン
  for (let row = 1; row <= rows - height + 1; row++) {
    for (let col = 1; col <= cols - width + 1; col++) {
      const position: GridPosition = {
        colStart: col,
        colEnd: col + width - 1,
        rowStart: row,
        rowEnd: row + height - 1,
      };

      if (isAreaAvailable(gridMap, position)) {
        return position;
      }
    }
  }

  return null;
}

/**
 * 要素を自動配置
 */
export function autoPlaceElements(
  elements: SlideElement[],
  grid: GridConfig,
  slideIndex?: number
): PlacedElement[] {
  const gridMap = createEmptyGridMap(grid.cols, grid.rows);
  const placed: PlacedElement[] = [];

  // まず、明示的に位置指定された要素を配置
  const explicitElements = elements.filter((e) => e.position);
  const implicitElements = elements.filter((e) => !e.position);

  // 明示的要素を面積の昇順でソート（小さい要素を先に配置）
  explicitElements.sort((a, b) => {
    const areaA = (a.position!.rowEnd - a.position!.rowStart + 1) * (a.position!.colEnd - a.position!.colStart + 1);
    const areaB = (b.position!.rowEnd - b.position!.rowStart + 1) * (b.position!.colEnd - b.position!.colStart + 1);
    return areaA - areaB;
  });

  // 位置未指定要素を面積の降順でソート（大きい要素を先に配置）
  implicitElements.sort((a, b) => {
    const areaA = estimateElementHeight(a) * estimateElementWidth(a, grid.cols);
    const areaB = estimateElementHeight(b) * estimateElementWidth(b, grid.cols);
    return areaB - areaA;
  });

  for (let i = 0; i < explicitElements.length; i++) {
    const element = explicitElements[i];
    validateGridPosition(element.position!, grid);
    // 重複を許容するため、利用可能チェックを削除
    placeOnGrid(gridMap, element.position!, placed.length);
    placed.push({
      type: element.type,
      content: element.content,
      level: element.level,
      position: element.position!,
      style: element.style,
      altText: element.altText,
      raw: element.raw,
    });
  }

  // 次に、位置未指定の要素を自動配置
  for (const element of implicitElements) {
    const height = estimateElementHeight(element);
    const width = estimateElementWidth(element, grid.cols);
    let position = findBestAvailablePosition(gridMap, width, height, grid);

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
    } else {
      // 配置できない場合は幅と高さを縮めて再試行
      let placedPosition = null;
      for (let w = width; w >= 1; w--) {
        for (let h = height; h >= 1; h--) {
          const pos = findBestAvailablePosition(gridMap, w, h, grid);
          if (pos) {
            placedPosition = pos;
            break;
          }
        }
        if (placedPosition) break;
      }

      if (placedPosition) {
        placeOnGrid(gridMap, placedPosition, placed.length);
        placed.push({
          type: element.type,
          content: element.content,
          level: element.level,
          position: placedPosition,
          style: element.style,
          raw: element.raw,
        });
      } else {
        // それでもダメならエラーを投げる（または警告）
        throw new GridError(
          `Cannot place element of type ${element.type} on the grid${slideIndex ? ` (slide ${slideIndex})` : ''}`,
          undefined,
          'Try reducing the number of elements or increasing grid size'
        );
      }
    }
  }

  // 配置順序を決定論的にする（重複時の描画順序を安定化）
  placed.sort((a, b) => {
    // 行でソート
    if (a.position.rowStart !== b.position.rowStart) {
      return a.position.rowStart - b.position.rowStart;
    }
    // 列でソート
    if (a.position.colStart !== b.position.colStart) {
      return a.position.colStart - b.position.colStart;
    }
    // 面積でソート（小さい要素を先に描画）
    const areaA = (a.position.rowEnd - a.position.rowStart + 1) * (a.position.colEnd - a.position.colStart + 1);
    const areaB = (b.position.rowEnd - b.position.rowStart + 1) * (b.position.colEnd - b.position.colStart + 1);
    return areaA - areaB;
  });

  return placed;
}
