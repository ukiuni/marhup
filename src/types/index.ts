/**
 * marhup 型定義
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
  animation?: AnimationConfig;
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
  | 'video'
  | 'table'
  | 'code'
  | 'blockquote'
  | 'mermaid';

// アニメーションタイプ
export type AnimationType =
  | 'appear'
  | 'fadein'
  | 'flyin'
  | 'zoom'
  | 'wipe'
  | 'split'
  | 'wheel'
  | 'randombars'
  | 'growshrink'
  | 'spin'
  | 'floatin'
  | 'shape'
  | 'bounce'
  | 'pulse'
  | 'teeter'
  | 'blink'
  | 'flicker'
  | 'swivel'
  | 'spring'
  | 'fadeout'
  | 'flyout'
  | 'floatout'
  | 'splitexit'
  | 'wipeexit'
  | 'shapeexit'
  | 'wheelexit'
  | 'randombarsexit'
  | 'shrinkandturn'
  | 'zoomexit'
  | 'swivelexit'
  | 'bounceexit'
  | 'disappear'
  | 'growandturn'
  | 'colorpulse'
  | 'desaturate'
  | 'darken'
  | 'lighten'
  | 'transparency'
  | 'objectcolor'
  | 'complementarycolor'
  | 'linecolor'
  | 'fillcolor'
  | 'pathdown'
  | 'patharcdown'
  | 'pathturnright'
  | 'pathcircle'
  | 'pathzigzag';

// アニメーション方向
export type AnimationDirection =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'horizontal'
  | 'vertical'
  | 'clockwise'
  | 'counterclockwise'
  | 'horizontalIn'
  | 'horizontalOut'
  | 'verticalIn'
  | 'verticalOut'
  | 'fromBottom'
  | 'fromTop'
  | 'fromLeft'
  | 'fromRight'
  | 'slideCenter'
  | 'objectCenter'
  | 'quarterSpin'
  | 'halfSpin'
  | 'fullSpin'
  | 'twoSpins'
  | 'tiny'
  | 'smaller'
  | 'larger'
  | 'huge'
  | '25%'
  | '50%'
  | '75%'
  | '100%'
  | 'floatUp'
  | 'floatDown'
  | 'circle'
  | 'box'
  | 'diamond'
  | 'plus'
  | 'in'
  | 'out';

// アニメーション設定
export interface AnimationConfig {
  type: AnimationType;
  duration?: number; // ミリ秒単位
  delay?: number; // ミリ秒単位
  direction?: AnimationDirection;
  trigger?: 'onClick' | 'afterPrevious' | 'withPrevious';
  repeat?: number;
  speed?: 'slow' | 'medium' | 'fast';
  // 追加のプロパティ
  class?: 'entr' | 'emph' | 'exit' | 'path';
  presetID?: number;
  presetSubtype?: number;
}

// スライド遷移タイプ
export type SlideTransitionType =
  | 'none'
  | 'fade'
  | 'push'
  | 'wipe'
  | 'split'
  | 'reveal'
  | 'randomBars'
  | 'shape'
  | 'uncover'
  | 'cover'
  | 'flash'
  | 'checker'
  | 'blinds'
  | 'clock'
  | 'ripple'
  | 'honeycomb'
  | 'glitter'
  | 'sphere'
  | 'newsflash'
  | 'plus'
  | 'diamond'
  | 'wedge'
  | 'wheel'
  | 'circle'
  | 'box'
  | 'zoom'
  | 'dissolve';

// スライド遷移方向
export type TransitionDirection =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'horizontal'
  | 'vertical'
  | 'clockwise'
  | 'counterclockwise';

// スライド遷移設定
export interface SlideTransitionConfig {
  type: SlideTransitionType;
  duration?: number; // 秒単位
  direction?: TransitionDirection;
  speed?: 'slow' | 'medium' | 'fast';
}

// スライド要素
export interface SlideElement {
  type: ElementType;
  content: string | ListItem[] | TableData;
  level?: number; // 見出しレベル（h1=1, h2=2, ...）
  position?: GridPosition;
  style?: StyleOptions;
  animation?: AnimationConfig;
  altText?: string; // 画像の代替テキスト
  raw?: string; // 元のMarkdown
}

// 配置済み要素
export interface PlacedElement extends SlideElement {
  position: GridPosition;
  animation?: AnimationConfig;
}

// Front Matter
export interface SlideFrontmatter {
  title?: string;
  grid?: string;
  layout?: string;
  theme?: string | Partial<ThemeConfig>;
  classes?: Record<string, Record<string, unknown>>;
  aliases?: Record<string, string>;
  animations?: AnimationConfig[];
  transition?: SlideTransitionConfig;
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
    [key: string]: string; // Allow additional custom colors
  };
  fonts: {
    title: string;
    body: string;
    code: string;
    [key: string]: string; // Allow additional custom fonts
  };
  fontSize: {
    h1: number;
    h2: number;
    h3: number;
    body: number;
    small: number;
    [key: string]: number; // Allow additional font sizes
  };
  slideMaster?: {
    backgroundColor?: string;
    backgroundImage?: string;
    margin?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
}

// 変換オプション
export interface ConvertOptions {
  output: string;
  theme?: string;
  grid?: string;
  watch?: boolean;
  basePath?: string; // 画像などの相対パス解決用
  pluginDir?: string; // プラグインディレクトリ
}

// 設定ファイルオプション
export interface ConfigOptions {
  output?: string;
  outputDir?: string;
  theme?: string;
  grid?: string;
  watch?: boolean;
  basePath?: string;
  lang?: string;
  pluginDir?: string;
}

// デフォルトグリッド（後方互換性のため）
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
  video: 4,
  table: 3,
  code: 3,
  blockquote: 2,
  mermaid: 4,
};
