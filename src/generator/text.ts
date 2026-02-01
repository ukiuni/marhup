/**
 * テキスト要素の生成
 */

import type { PlacedElement } from '../layout/index.js';
import type { ThemeConfig, AnimationConfig } from '../types/index.js';
import type { ISlide, TextOptions } from './presentation.js';

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
  slide: ISlide,
  element: PlacedElement,
  coords: Coordinates,
  styleProps: Record<string, unknown>,
  theme: ThemeConfig,
  animation?: AnimationConfig
): void {
  const level = element.level || 1;
  const content = element.content as string;

  // レベルに応じたフォントサイズ
  const fontSizeMap: Record<number, number> = {
    1: theme.fontSize.h1,
    2: theme.fontSize.h2,
    3: theme.fontSize.h3,
    4: 20,
    5: 18,
    6: 16,
  };

  const fontSize = fontSizeMap[level] || theme.fontSize.body;

  // テキストスタイルオプションを構築
  const textOptions: TextOptions & Coordinates = {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fontSize,
    bold: level <= 2,
    color: theme.colors.text.replace('#', ''),
    align: level === 1 ? 'center' : 'left',
    valign: 'middle',
    ...styleProps,
  };

  // アニメーション設定
  if (animation) {
    textOptions.animation = {
      type: animation.type,
      duration: animation.duration,
      delay: animation.delay,
    };
  }

  slide.addText(content, textOptions);
}

/**
 * 段落要素を追加
 */
export function addTextElement(
  slide: ISlide,
  element: PlacedElement,
  coords: Coordinates,
  styleProps: Record<string, unknown>,
  theme: ThemeConfig,
  animation?: AnimationConfig
): void {
  const content = element.content as string;

  // テキストスタイルオプションを構築
  const textOptions: TextOptions & Coordinates = {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fontSize: theme.fontSize.body,
    color: theme.colors.text.replace('#', ''),
    fontFace: theme.fonts.body,
    align: 'left',
    valign: 'top',
    ...styleProps,
  };

  // アニメーション設定
  if (animation) {
    textOptions.animation = {
      type: animation.type,
      duration: animation.duration,
      delay: animation.delay,
    };
  }

  slide.addText(content, textOptions);
}
