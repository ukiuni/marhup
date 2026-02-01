/**
 * レイアウト関連の型定義
 */

import type { GridPosition, SlideElement, StyleOptions } from '../types/index.js';

// 配置済み要素
export interface PlacedElement {
  type: SlideElement['type'];
  content: SlideElement['content'];
  level?: number;
  position: GridPosition;
  style?: StyleOptions;
  altText?: string; // 画像の代替テキスト
  raw?: string;
}

// グリッドセルの状態
export interface GridCell {
  occupied: boolean;
  elementIndex?: number;
}

// グリッドマップ
export type GridMap = GridCell[][];

// レイアウト結果
export interface LayoutResult {
  elements: PlacedElement[];
  gridMap: GridMap;
}
