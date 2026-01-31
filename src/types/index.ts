/**
 * md2ppt 型定義
 */

// グリッド位置
export interface GridPosition {
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
}

// スタイルオプション
export interface StyleOptions {
  classes: string[];
  properties: Record<string, string>;
}

// リストアイテム
export interface ListItem {
  content: string;
  level: number;
  ordered: boolean;
  children?: ListItem[];
}

// テーブルデータ
export interface TableData {
  headers: string[];
  rows: string[][];
}

// スライド要素タイプ
export type ElementType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'image'
  | 'table'
  | 'code'
  | 'blockquote';

// スライド要素
export interface SlideElement {
  type: ElementType;
  content: string | ListItem[] | TableData;
  level?: number; // 見出しレベル（h1=1, h2=2, ...）
  position?: GridPosition;
  style?: StyleOptions;
  raw?: string; // 元のMarkdown
}

// 配置済み要素
export interface PlacedElement extends SlideElement {
  position: GridPosition;
}

// Front Matter
export interface SlideFrontmatter {
  title?: string;
  grid?: string;
  layout?: string;
  theme?: string;
  [key: string]: unknown;
}

// スライド
export interface Slide {
  frontmatter: SlideFrontmatter;
  elements: SlideElement[];
}

// パース済みドキュメント
export interface ParsedDocument {
  globalFrontmatter: SlideFrontmatter;
  slides: Slide[];
}

// グリッド設定
export interface GridConfig {
  cols: number;
  rows: number;
}

// テーマ設定
export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    title: string;
    body: string;
    code: string;
  };
  fontSize: {
    h1: number;
    h2: number;
    h3: number;
    body: number;
    small: number;
  };
}

// 変換オプション
export interface ConvertOptions {
  output: string;
  theme?: string;
  grid?: string;
  watch?: boolean;
  basePath?: string; // 画像などの相対パス解決用
}

// デフォルトグリッド
export const DEFAULT_GRID: GridConfig = {
  cols: 12,
  rows: 9,
};

// デフォルト要素高さ（行数）
export const DEFAULT_ELEMENT_HEIGHT: Record<ElementType, number> = {
  heading: 1,
  paragraph: 2,
  list: 3,
  image: 4,
  table: 3,
  code: 3,
  blockquote: 2,
};
