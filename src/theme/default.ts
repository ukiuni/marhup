/**
 * デフォルトテーマ
 */

import type { ThemeConfig } from '../types/index.js';

export const defaultTheme: ThemeConfig = {
  name: 'default',
  colors: {
    primary: '#2563eb',     // 青
    secondary: '#64748b',   // グレー
    accent: '#f59e0b',      // オレンジ
    background: '#ffffff',  // 白
    text: '#1e293b',        // ダークグレー
  },
  fonts: {
    title: 'Arial',
    body: 'Arial',
    code: 'Courier New',
  },
  fontSize: {
    h1: 36,
    h2: 28,
    h3: 24,
    body: 18,
    small: 14,
  },
};

// スタイルクラスの定義
export const styleClasses: Record<string, Record<string, unknown>> = {
  // 配置
  center: { align: 'center', valign: 'middle' },
  left: { align: 'left' },
  right: { align: 'right' },

  // 色
  red: { color: '#dc2626' },
  blue: { color: '#2563eb' },
  green: { color: '#16a34a' },
  gray: { color: '#6b7280' },
  orange: { color: '#ea580c' },
  purple: { color: '#9333ea' },

  // 背景色
  'bg-red': { fill: { color: '#fef2f2' } },
  'bg-blue': { fill: { color: '#eff6ff' } },
  'bg-green': { fill: { color: '#f0fdf4' } },
  'bg-gray': { fill: { color: '#f9fafb' } },

  // サイズ
  small: { fontSize: 14 },
  large: { fontSize: 24 },

  // 装飾
  bold: { bold: true },
  highlight: { fill: { color: '#fef3c7' } },
  card: { 
    fill: { color: '#f8fafc' },
    line: { color: '#e2e8f0', width: 1 },
  },

  // 特殊
  header: { fill: { color: '#1e40af' }, color: '#ffffff' },
  footer: { fontSize: 12, color: '#9ca3af' },
  note: { fontSize: 12, color: '#6b7280', italic: true },
};

/**
 * スタイルクラスをpptxgenjs形式に変換
 */
export function resolveStyleClasses(classes: string[], customClasses?: Record<string, Record<string, unknown>>): Record<string, unknown> {
  let result: Record<string, unknown> = {};

  for (const className of classes) {
    let style = customClasses?.[className];
    if (!style) {
      style = styleClasses[className];
    }
    if (style) {
      result = { ...result, ...style };
    }
  }

  return result;
}
