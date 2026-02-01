/**
 * 画像要素の生成
 */

import type PptxGenJS from 'pptxgenjs';
import type { PlacedElement } from '../layout/index';
import * as fs from 'fs';
import * as path from 'path';
import imageSize from 'image-size';

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
    const buffer = fs.readFileSync(filePath);
    const dimensions = imageSize(buffer);
    if (dimensions.width && dimensions.height) {
      return { width: dimensions.width, height: dimensions.height };
    }
  } catch (error) {
    console.warn('画像サイズの取得に失敗:', error);
  }
  return null;
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
  slide: PptxGenJS.Slide,
  element: PlacedElement,
  coords: Coordinates,
  styleProps: Record<string, unknown>,
  basePath?: string
): void {
  const imagePath = element.content as string;

  // URLかローカルファイルかを判定
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    // URL画像（サイズ取得が難しいのでそのまま配置）
    slide.addImage({
      path: imagePath,
      x: coords.x,
      y: coords.y,
      w: coords.w,
      h: coords.h,
      sizing: { type: 'contain', w: coords.w, h: coords.h },
    });
  } else {
    // ローカルファイル
    try {
      // ベースパスがあれば、そこからの相対パスとして解決
      let absolutePath: string;
      if (basePath && !path.isAbsolute(imagePath)) {
        absolutePath = path.resolve(basePath, imagePath);
      } else {
        absolutePath = path.resolve(imagePath);
      }
      
      if (fs.existsSync(absolutePath)) {
        const imageBuffer = fs.readFileSync(absolutePath);
        const base64 = imageBuffer.toString('base64');
        const ext = path.extname(imagePath).slice(1).toLowerCase();
        const mimeType = getMimeType(ext);

        // 画像サイズを取得してアスペクト比維持・中央配置
        const dimensions = getImageDimensions(absolutePath);
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

        slide.addImage({
          data: `data:${mimeType};base64,${base64}`,
          x: finalCoords.x,
          y: finalCoords.y,
          w: finalCoords.w,
          h: finalCoords.h,
        });
      } else {
        // ファイルが存在しない場合はプレースホルダーを表示
        console.warn('画像が見つかりません:', absolutePath);
        addImagePlaceholder(slide, coords, imagePath);
      }
    } catch (error) {
      console.warn('画像の読み込みに失敗しました:', imagePath, error);
      addImagePlaceholder(slide, coords, imagePath);
    }
  }
}

/**
 * 画像プレースホルダーを追加
 */
function addImagePlaceholder(
  slide: PptxGenJS.Slide,
  coords: Coordinates,
  imagePath: string
): void {
  slide.addShape('rect', {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fill: { color: 'f0f0f0' },
    line: { color: 'cccccc', width: 1 },
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

/**
 * 拡張子からMIMEタイプを取得
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  };
  return mimeTypes[ext] || 'image/png';
}
