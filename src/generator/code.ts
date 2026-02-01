/**
 * コード要素の生成
 */

import type { PlacedElement } from '../layout/index.js';
import type { ThemeConfig, AnimationConfig } from '../types/index.js';
import type { ISlide } from './presentation.js';

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
  slide: ISlide,
  element: PlacedElement,
  coords: Coordinates,
  styleProps: Record<string, unknown>,
  theme: ThemeConfig,
  animation?: AnimationConfig
): void {
  const content = element.content as string;

  // 背景
  slide.addShape('rect', {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fill: { color: '1e293b' },
    line: '334155',
  });

  // コードテキスト
  slide.addText(content, {
    x: coords.x + 0.1,
    y: coords.y + 0.1,
    w: coords.w - 0.2,
    h: coords.h - 0.2,
    fontSize: 14,
    color: 'e2e8f0',
    align: 'left',
    valign: 'top',
    ...styleProps,
    animation: animation ? {
      type: animation.type,
      duration: animation.duration,
      delay: animation.delay,
    } : undefined,
  });
}
