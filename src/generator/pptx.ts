/**
 * PPTX生成メインモジュール
 */

import PptxGenJS from 'pptxgenjs';
import type { ParsedDocument, GridConfig } from '../types/index.js';
import { layoutSlide, gridToCoordinates } from '../layout/index.js';
import type { PlacedElement } from '../layout/index.js';
import { parseGridString } from '../parser/index.js';
import { defaultTheme, resolveStyleClasses } from '../theme/index.js';
import { addTextElement, addHeadingElement } from './text.js';
import { addImageElement } from './image.js';
import { addTableElement } from './table.js';
import { addListElement } from './list.js';
import { addCodeElement } from './code.js';

// スライドサイズ（インチ）- 16:9
const SLIDE_SIZE = { width: 10, height: 5.625 };
const MARGIN = 0.5;

/**
 * ParsedDocumentからPPTXを生成
 */
export async function generatePptx(
  document: ParsedDocument,
  outputPath: string,
  basePath?: string
): Promise<void> {
  const pptx = new PptxGenJS();

  // プレゼンテーション設定
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = document.globalFrontmatter.title || 'Presentation';
  pptx.author = 'md2ppt';

  // グローバルグリッド設定
  const globalGridStr = document.globalFrontmatter.grid || '12x9';
  const globalGrid = parseGridString(globalGridStr);

  // 各スライドを生成
  for (const slide of document.slides) {
    const pptxSlide = pptx.addSlide();

    // スライドのグリッド設定
    const slideGridStr = slide.frontmatter.grid || globalGridStr;
    const slideGrid = parseGridString(slideGridStr);

    // レイアウト計算
    const layout = layoutSlide(slide, document.globalFrontmatter);

    // 要素を配置
    for (const element of layout.elements) {
      addElement(pptxSlide, element, slideGrid, basePath);
    }
  }

  // ファイル保存
  await pptx.writeFile({ fileName: outputPath });
}

/**
 * 要素をスライドに追加
 */
function addElement(
  slide: PptxGenJS.Slide,
  element: PlacedElement,
  grid: GridConfig,
  basePath?: string
): void {
  // グリッド位置を座標に変換
  const coords = gridToCoordinates(element.position, grid, SLIDE_SIZE, MARGIN);

  // スタイルを解決
  const styleProps = element.style?.classes
    ? resolveStyleClasses(element.style.classes)
    : {};

  // 要素タイプに応じて追加
  switch (element.type) {
    case 'heading':
      addHeadingElement(slide, element, coords, styleProps);
      break;

    case 'paragraph':
      addTextElement(slide, element, coords, styleProps);
      break;

    case 'list':
      addListElement(slide, element, coords, styleProps);
      break;

    case 'image':
      addImageElement(slide, element, coords, styleProps, basePath);
      break;

    case 'table':
      addTableElement(slide, element, coords, styleProps);
      break;

    case 'code':
      addCodeElement(slide, element, coords, styleProps);
      break;

    case 'blockquote':
      addTextElement(slide, element, coords, { ...styleProps, italic: true });
      break;

    default:
      console.warn('未対応の要素タイプ:', element.type);
  }
}
