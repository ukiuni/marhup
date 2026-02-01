/**
 * テーブル要素の生成
 */

import type { PlacedElement } from '../layout/index.js';
import type { TableData, ThemeConfig, AnimationConfig } from '../types/index.js';
import type { ISlide } from './presentation.js';

interface Coordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * テーブル要素を追加
 */
export function addTableElement(
  slide: ISlide,
  element: PlacedElement,
  coords: Coordinates,
  _styleProps: Record<string, unknown>,
  theme: ThemeConfig,
  animation?: AnimationConfig
): void {
  const tableData = element.content as TableData;

  // Convert to simple string array for abstraction
  const rows: string[][] = [
    tableData.headers,
    ...tableData.rows
  ];

  slide.addTable(rows, {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    colW: Array(tableData.headers.length).fill(coords.w / tableData.headers.length),
    animation: animation ? {
      type: animation.type,
      duration: animation.duration,
      delay: animation.delay,
    } : undefined,
  });
}
