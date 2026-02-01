/**
 * 動画要素の生成
 */

import type { PlacedElement } from '../layout/index.js';
import type { AnimationConfig } from '../types/index.js';
import * as fs from 'fs';
import type { ISlide } from './presentation.js';
import { validateAndResolvePath } from '../utils/path-validation.js';
import { t } from '../utils/i18n.js';

interface Coordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 動画要素を追加
 */
export function addVideoElement(
  slide: ISlide,
  element: PlacedElement,
  coords: Coordinates,
  styleProps: Record<string, unknown>,
  basePath?: string,
  animation?: AnimationConfig
): void {
  const videoPath = element.content as string;

  // URLかローカルファイルかを判定
  if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    // URL動画
    slide.addMedia(videoPath, {
      x: coords.x,
      y: coords.y,
      w: coords.w,
      h: coords.h,
      type: 'video',
      animation: animation ? {
        type: animation.type,
        duration: animation.duration,
        delay: animation.delay,
      } : undefined,
    });
  } else {
    // ローカルファイル
    try {
      // ベースパスがあれば、そこからの相対パスとして解決
      const allowedDir = basePath || process.cwd();
      const absolutePath = validateAndResolvePath(videoPath, allowedDir, basePath);

      if (fs.existsSync(absolutePath)) {
        slide.addMedia(absolutePath, {
          x: coords.x,
          y: coords.y,
          w: coords.w,
          h: coords.h,
          type: 'video',
          animation: animation ? {
            type: animation.type,
            duration: animation.duration,
            delay: animation.delay,
          } : undefined,
        });
      } else {
        // ファイルが存在しない場合はプレースホルダーを表示
        console.warn(t('errors.videoNotFound', { path: absolutePath }));
        addVideoPlaceholder(slide, coords, videoPath);
      }
    } catch (error) {
      console.warn(t('errors.videoLoadFailed', { path: videoPath, error }));
      addVideoPlaceholder(slide, coords, videoPath);
    }
  }
}

/**
 * 動画プレースホルダーを追加
 */
function addVideoPlaceholder(
  slide: ISlide,
  coords: Coordinates,
  videoPath: string
): void {
  slide.addShape('rect', {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fill: { color: '000000' },
    line: 'cccccc',
  });

  slide.addText(`[Video: ${videoPath}]`, {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fontSize: 12,
    color: 'ffffff',
    align: 'center',
    valign: 'middle',
  });
}