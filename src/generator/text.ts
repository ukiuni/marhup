/**
 * テキスト要素の生成
 */

import type PptxGenJS from 'pptxgenjs';
import type { PlacedElement } from '../layout/index';
import { defaultTheme } from '../theme/index';

interface Coordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 見出し要素を追加
 */
export function addHeadingElement(
  slide: PptxGenJS.Slide,
  element: PlacedElement,
  coords: Coordinates,
  styleProps: Record<string, unknown>
): void {
  const level = element.level || 1;
  const content = element.content as string;

  // レベルに応じたフォントサイズ
  const fontSizeMap: Record<number, number> = {
    1: defaultTheme.fontSize.h1,
    2: defaultTheme.fontSize.h2,
    3: defaultTheme.fontSize.h3,
    4: 20,
    5: 18,
    6: 16,
  };

  const fontSize = fontSizeMap[level] || defaultTheme.fontSize.body;

  slide.addText(content, {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fontSize,
    bold: level <= 2,
    color: defaultTheme.colors.text.replace('#', ''),
    fontFace: defaultTheme.fonts.title,
    align: level === 1 ? 'center' : 'left',
    valign: 'middle',
    ...styleProps,
  });
}

/**
 * 段落要素を追加
 */
export function addTextElement(
  slide: PptxGenJS.Slide,
  element: PlacedElement,
  coords: Coordinates,
  styleProps: Record<string, unknown>
): void {
  const content = element.content as string;

  slide.addText(content, {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fontSize: defaultTheme.fontSize.body,
    color: defaultTheme.colors.text.replace('#', ''),
    fontFace: defaultTheme.fonts.body,
    align: 'left',
    valign: 'top',
    ...styleProps,
  });
}
