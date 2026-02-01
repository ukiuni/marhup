/**
 * リスト要素の生成
 */

import type PptxGenJS from 'pptxgenjs';
import type { PlacedElement } from '../layout/index';
import type { ListItem } from '../types/index';
import { defaultTheme } from '../theme/index';

interface Coordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * リスト要素を追加
 */
export function addListElement(
  slide: PptxGenJS.Slide,
  element: PlacedElement,
  coords: Coordinates,
  styleProps: Record<string, unknown>
): void {
  const items = element.content as ListItem[];

  // リストアイテムをpptxgenjs形式に変換
  const textRows: PptxGenJS.TextProps[] = items.map((item) => ({
    text: item.content,
    options: {
      bullet: item.ordered ? { type: 'number' } : true,
      indentLevel: item.level,
      fontSize: defaultTheme.fontSize.body,
      color: defaultTheme.colors.text.replace('#', ''),
      fontFace: defaultTheme.fonts.body,
    },
  }));

  slide.addText(textRows, {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    valign: 'top',
    ...styleProps,
  });
}
