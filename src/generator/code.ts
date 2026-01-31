/**
 * コード要素の生成
 */

import type PptxGenJS from 'pptxgenjs';
import type { PlacedElement } from '../layout/index.js';
import { defaultTheme } from '../theme/index.js';

interface Coordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * コード要素を追加
 */
export function addCodeElement(
  slide: PptxGenJS.Slide,
  element: PlacedElement,
  coords: Coordinates,
  styleProps: Record<string, unknown>
): void {
  const content = element.content as string;

  // 背景
  slide.addShape('rect', {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fill: { color: '1e293b' },
    line: { color: '334155', width: 1 },
  });

  // コードテキスト
  slide.addText(content, {
    x: coords.x + 0.1,
    y: coords.y + 0.1,
    w: coords.w - 0.2,
    h: coords.h - 0.2,
    fontSize: 14,
    color: 'e2e8f0',
    fontFace: defaultTheme.fonts.code,
    align: 'left',
    valign: 'top',
    ...styleProps,
  });
}
