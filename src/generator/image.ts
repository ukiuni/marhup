/**
 * 画像要素の生成
 */

import type { PlacedElement } from '../layout/index.js';
import type { AnimationConfig } from '../types/index.js';
import * as fs from 'fs';
import * as path from 'path';
import imageSize from 'image-size';
import type { ISlide } from './presentation.js';
import { t } from '../utils/i18n.js';
import { validateAndResolvePath } from '../utils/path-validation.js';
import { sanitizeSvg } from '../utils/sanitizer.js';

interface Coordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 画像のサイズを取得
 */
function getImageDimensions(filePath: string): { width: number; height: number } | null {
  try {
    const dimensions = (imageSize as any)(filePath);
    if (dimensions.width && dimensions.height) {
      return { width: dimensions.width, height: dimensions.height };
    }
  } catch (error) {
    console.warn(t('errors.imageSizeFailed', { error }));
  }
  return null;
}

/**
 * SVGファイルをdata URIに変換
 */
function convertSvgToDataUri(filePath: string): string | null {
  try {
    const svgContent = fs.readFileSync(filePath, 'utf8');
    const sanitizedSvg = sanitizeSvg(svgContent);
    const base64 = Buffer.from(sanitizedSvg).toString('base64');
    // メモリ解放のため、変数をnull化
    const dataUri = `data:image/svg+xml;base64,${base64}`;
    return dataUri;
  } catch (error) {
    console.warn(t('errors.svgConversionFailed', { error }));
    return null;
  }
}

/**
 * アスペクト比を維持しながら領域に収まる最大サイズと中央位置を計算
 */
function calculateCenteredFit(
  imageWidth: number,
  imageHeight: number,
  areaWidth: number,
  areaHeight: number,
  areaX: number,
  areaY: number
): { x: number; y: number; w: number; h: number } {
  const imageAspect = imageWidth / imageHeight;
  const areaAspect = areaWidth / areaHeight;

  let finalWidth: number;
  let finalHeight: number;

  if (imageAspect > areaAspect) {
    // 画像が横長 → 幅に合わせる
    finalWidth = areaWidth;
    finalHeight = areaWidth / imageAspect;
  } else {
    // 画像が縦長 → 高さに合わせる
    finalHeight = areaHeight;
    finalWidth = areaHeight * imageAspect;
  }

  // 中央配置のオフセットを計算
  const offsetX = (areaWidth - finalWidth) / 2;
  const offsetY = (areaHeight - finalHeight) / 2;

  return {
    x: areaX + offsetX,
    y: areaY + offsetY,
    w: finalWidth,
    h: finalHeight,
  };
}

/**
 * 画像要素を追加
 */
export function addImageElement(
  slide: ISlide,
  element: PlacedElement,
  coords: Coordinates,
  styleProps: Record<string, unknown>,
  basePath?: string,
  animation?: AnimationConfig
): void {
  const imagePath = element.content as string;

  // URLかローカルファイルかを判定
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    // URL画像（サイズ取得が難しいのでそのまま配置）
    slide.addImage(imagePath, {
      x: coords.x,
      y: coords.y,
      w: coords.w,
      h: coords.h,
      sizing: { type: 'contain', w: coords.w, h: coords.h },
      altText: element.altText,
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
      const absolutePath = validateAndResolvePath(imagePath, allowedDir, basePath);
      
      if (fs.existsSync(absolutePath)) {
        // SVGファイルの場合はdata URIに変換
        const isSvg = path.extname(absolutePath).toLowerCase() === '.svg';
        let imageSource: string;
        let dimensions: { width: number; height: number } | null = null;

        if (isSvg) {
          const dataUri = convertSvgToDataUri(absolutePath);
          if (dataUri) {
            imageSource = dataUri;
            // SVGの場合はサイズを取得しようとするが、取得できなくてもそのまま使用
            dimensions = getImageDimensions(absolutePath);
          } else {
            // 変換失敗時はプレースホルダー
            addImagePlaceholder(slide, coords, imagePath);
            return;
          }
        } else {
          imageSource = absolutePath;
          // 他の画像形式の場合はサイズを取得
          dimensions = getImageDimensions(absolutePath);
        }

        let finalCoords = coords;

        if (dimensions) {
          finalCoords = calculateCenteredFit(
            dimensions.width,
            dimensions.height,
            coords.w,
            coords.h,
            coords.x,
            coords.y
          );
        }

        slide.addImage(imageSource, {
          x: finalCoords.x,
          y: finalCoords.y,
          w: finalCoords.w,
          h: finalCoords.h,
          altText: element.altText,
          animation: animation ? {
            type: animation.type,
            duration: animation.duration,
            delay: animation.delay,
          } : undefined,
        });
      } else {
        // ファイルが存在しない場合はプレースホルダーを表示
        console.warn(t('errors.imageNotFound', { path: absolutePath }));
        addImagePlaceholder(slide, coords, imagePath);
      }
    } catch (error) {
      console.warn(t('errors.imageLoadFailed', { path: imagePath, error }));
      addImagePlaceholder(slide, coords, imagePath);
    }
  }
}

/**
 * 画像プレースホルダーを追加
 */
function addImagePlaceholder(
  slide: ISlide,
  coords: Coordinates,
  imagePath: string
): void {
  slide.addShape('rect', {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fill: { color: 'f0f0f0' },
    line: 'cccccc',
  });

  slide.addText(`[Image: ${imagePath}]`, {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fontSize: 12,
    color: '999999',
    align: 'center',
    valign: 'middle',
  });
}


