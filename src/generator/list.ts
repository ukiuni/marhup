/**
 * リスト要素の生成
 */

import type { PlacedElement } from '../layout/index.js';
import type { ListItem, ThemeConfig, AnimationConfig } from '../types/index.js';
import type { ISlide } from './presentation.js';

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
  slide: ISlide,
  element: PlacedElement,
  coords: Coordinates,
  styleProps: Record<string, unknown>,
  theme: ThemeConfig,
  animation?: AnimationConfig
): void {
  const items = element.content as ListItem[];

  // Convert list to text with bullets
  const textContent = items.map((item) => {
    const indent = '  '.repeat(item.level);
    const bullet = item.ordered ? `${item.level + 1}.` : '•';
    return `${indent}${bullet} ${item.content}`;
  }).join('\n');

  slide.addText(textContent, {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fontSize: theme.fontSize.body,
    color: theme.colors.text.replace('#', ''),
    valign: 'top',
    ...styleProps,
    animation: animation ? {
      type: animation.type,
      duration: animation.duration,
      delay: animation.delay,
    } : undefined,
  });
}
