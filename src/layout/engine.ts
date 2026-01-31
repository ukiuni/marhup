/**
 * レイアウトエンジン
 */

import type { Slide, GridConfig, SlideFrontmatter } from '../types/index.js';
import { parseGridString } from '../parser/frontmatter.js';
import { autoPlaceElements } from './auto.js';
import type { PlacedElement, LayoutResult } from './types.js';

// デフォルトグリッド
const _DEFAULT_GRID: GridConfig = { cols: 12, rows: 9 };

/**
 * スライドのレイアウトを計算
 */
export function layoutSlide(
  slide: Slide,
  globalFrontmatter: SlideFrontmatter
): LayoutResult {
  // グリッド設定を決定（スライド個別 > グローバル > デフォルト）
  const gridStr =
    slide.frontmatter.grid || globalFrontmatter.grid || '12x9';
  const grid = parseGridString(gridStr);

  // 要素を配置
  const elements = autoPlaceElements(slide.elements, grid);

  // グリッドマップを作成（デバッグ用）
  const gridMap = createGridMapFromElements(elements, grid);

  return {
    elements,
    gridMap,
  };
}

/**
 * 配置済み要素からグリッドマップを作成
 */
function createGridMapFromElements(
  elements: PlacedElement[],
  grid: GridConfig
) {
  const gridMap = Array.from({ length: grid.rows }, () =>
    Array.from({ length: grid.cols }, () => ({ occupied: false, elementIndex: undefined as number | undefined }))
  );

  elements.forEach((element, index) => {
    const { position } = element;
    for (let row = position.rowStart - 1; row < position.rowEnd; row++) {
      for (let col = position.colStart - 1; col < position.colEnd; col++) {
        if (row >= 0 && row < grid.rows && col >= 0 && col < grid.cols) {
          gridMap[row][col] = { occupied: true, elementIndex: index };
        }
      }
    }
  });

  return gridMap;
}

/**
 * グリッド位置をスライド上の座標に変換（インチ単位）
 */
export function gridToCoordinates(
  position: { colStart: number; colEnd: number; rowStart: number; rowEnd: number },
  grid: GridConfig,
  slideSize: { width: number; height: number },
  margin: number = 0.5
): { x: number; y: number; w: number; h: number } {
  const contentWidth = slideSize.width - margin * 2;
  const contentHeight = slideSize.height - margin * 2;

  const cellWidth = contentWidth / grid.cols;
  const cellHeight = contentHeight / grid.rows;

  const x = margin + (position.colStart - 1) * cellWidth;
  const y = margin + (position.rowStart - 1) * cellHeight;
  const w = (position.colEnd - position.colStart + 1) * cellWidth;
  const h = (position.rowEnd - position.rowStart + 1) * cellHeight;

  return { x, y, w, h };
}
