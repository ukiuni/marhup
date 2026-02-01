/**
 * PPTX生成メインモジュール
 */

import * as fs from 'fs';
import type { ParsedDocument, GridConfig, Slide, ThemeConfig } from '../types/index.js';
import { layoutSlide, gridToCoordinates } from '../layout/index.js';
import type { PlacedElement } from '../layout/index.js';
import { parseGridString } from '../parser/index.js';
import { resolveStyleClasses, resolveTheme } from '../theme/index.js';
import { addTextElement, addHeadingElement } from './text.js';
import { addImageElement } from './image.js';
import { addVideoElement } from './video.js';
import { addTableElement } from './table.js';
import { addListElement } from './list.js';
import { addCodeElement } from './code.js';
import { addMermaidElement, cleanupTempDir } from './mermaid.js';
import { GenerationError } from '../errors.js';
import { withFileLock } from '../utils/file-lock.js';
import { createPresentation, type ISlide } from './presentation.js';
import { pluginManager } from '../utils/plugin-manager.js';
import type { ElementGeneratorContext } from '../types/plugin.js';
import { sanitizeText, sanitizeElement } from '../utils/sanitizer.js';
import logger from '../utils/logger.js';

// スライドサイズ（インチ）- 16:10 for compatibility with PowerPoint 2007+
// PowerPoint 2007 only supports 4:3 and 16:10 layouts, not 16:9
const SLIDE_SIZE = { width: 10, height: 6.25 };
const MARGIN = 0.5;

/**
 * ParsedDocumentからPPTXを生成
 */
export async function generatePptx(
  document: ParsedDocument,
  outputPath: string,
  basePath?: string
): Promise<void> {
  logger.info('Starting PPTX generation', { outputPath, basePath, slideCount: document.slides.length });

  return withFileLock(outputPath, async () => {
    // 既存ファイルのバックアップ（プロセス固有の名前）
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const backupPath = `${outputPath}.bak.${timestamp}.${randomId}`;
    if (fs.existsSync(outputPath)) {
      fs.renameSync(outputPath, backupPath);
      logger.debug(`Created backup: ${backupPath}`);
    }

    const tempFiles: string[] = [];

    try {
    const pptx = createPresentation({
      layout: 'LAYOUT_16x10',
      title: sanitizeText(document.globalFrontmatter.title || 'Presentation'),
      author: 'marhup'
    });
    logger.debug('Created PPTX presentation', { title: document.globalFrontmatter.title });

    // グローバルテーマを取得
    const globalTheme = resolveTheme(document.globalFrontmatter.theme, basePath);
    logger.debug('Resolved global theme', { theme: document.globalFrontmatter.theme });

    // スライドマスターの設定（テーマが指定されている場合）
    if (globalTheme.slideMaster) {
      pptx.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: globalTheme.slideMaster.backgroundColor ? { color: globalTheme.slideMaster.backgroundColor } : undefined,
        margin: globalTheme.slideMaster.margin ? [
          globalTheme.slideMaster.margin.top,
          globalTheme.slideMaster.margin.bottom,
          globalTheme.slideMaster.margin.left,
          globalTheme.slideMaster.margin.right
        ] : undefined,
      });
      logger.debug('Defined slide master');
    }

    // グローバルグリッド設定
    const globalGridStr = document.globalFrontmatter.grid || '12x9';

    // すべての要素のcontentをサニタイズ
    document.slides.forEach(slide => slide.elements.forEach(sanitizeElement));

    // 各スライドを生成
    for (const slide of document.slides) {
      const slideIndex = document.slides.indexOf(slide) + 1;
      logger.debug(`Processing slide ${slideIndex}/${document.slides.length}`, { elementCount: slide.elements.length });

      // スライド遷移設定
      const slideOptions: { master?: string; transition?: { type?: string; duration?: number; direction?: string; speed?: string } } = {};
      
      // マスタースライドを使用（定義されている場合）
      if (globalTheme.slideMaster) {
        slideOptions.master = 'MASTER_SLIDE';
      }
      
      // スライド固有の遷移設定
      if (slide.frontmatter?.transition) {
        slideOptions.transition = {
          type: slide.frontmatter.transition.type,
          ...(slide.frontmatter.transition.duration && { duration: slide.frontmatter.transition.duration }),
          ...(slide.frontmatter.transition.direction && { direction: slide.frontmatter.transition.direction }),
          ...(slide.frontmatter.transition.speed && { speed: slide.frontmatter.transition.speed }),
        };
        logger.debug('Applied slide transition', { transition: slideOptions.transition });
      }

      const pptxSlide = pptx.addSlide(slideOptions);

      // スライドのグリッド設定
      const slideGridStr = slide.frontmatter?.grid || globalGridStr;
      const slideGrid = parseGridString(slideGridStr);

      // テーマ解決（スライド固有 > グローバル）
      const theme = resolveTheme(slide.frontmatter.theme || document.globalFrontmatter.theme);

      // スライド固有の背景グラデーションを適用
      // Note: Gradient backgrounds are defined but temporarily disabled due to PptxGenJS compatibility issues
      // if (theme.gradients?.background) {
      //   const gradient = theme.gradients.background;
      //   if (gradient.type === 'linear') {
      //     pptxSlide.background = {
      //       fill: {
      //         type: 'gradient',
      //         gradient: {
      //           type: 'linear',
      //           angle: gradient.angle || 0,
      //           stops: gradient.colors.map((color, index) => ({
      //             position: index / (gradient.colors.length - 1),
      //             color: color.replace('#', ''),
      //           })),
      //         },
      //       },
      //     };
      //   }
      // }

      // レイアウト計算
      const layout = layoutSlide(slide, document.globalFrontmatter, slideIndex);
      logger.debug(`Calculated layout for slide ${slideIndex}`, { elementCount: layout.elements.length });

      // 要素を配置
      for (const element of layout.elements) {
        logger.debug(`Adding element to slide ${slideIndex}`, { type: element.type, position: element.position });
        const temps = await addElement(pptxSlide, element, slideGrid, slide, theme, basePath);
        tempFiles.push(...temps);
      }
    }

    // ファイル保存
    logger.debug('Writing PPTX file', { outputPath });
    await pptx.writeFile({ fileName: outputPath });
    logger.info('PPTX file written successfully');

    // 一時ファイルをクリーンアップ
    for (const file of tempFiles) {
      try {
        fs.unlinkSync(file);
        logger.debug('Cleaned up temporary file', { file });
      } catch (error) {
        logger.warn('Failed to clean up temporary file', { file, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // 成功したらバックアップを削除
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      logger.debug('Removed backup file');
    }
  } catch (error) {
    logger.error('PPTX generation failed', { outputPath, error: error instanceof Error ? error.message : String(error) });

    // Clean up temporary files
    for (const file of tempFiles) {
      try {
        fs.unlinkSync(file);
        logger.debug('Cleaned up temporary file during error recovery', { file });
      } catch (cleanupError) {
        logger.warn('Failed to clean up temporary file during error recovery', { file, error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) });
      }
    }

    // Restore backup if it exists
    if (fs.existsSync(backupPath)) {
      try {
        fs.renameSync(backupPath, outputPath);
        logger.info('Restored previous version from backup');
      } catch (restoreError) {
        logger.error('Failed to restore backup', { backupPath, error: restoreError instanceof Error ? restoreError.message : String(restoreError) });
      }
    } else {
      // Remove partially generated file
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
          logger.debug('Removed partially generated file');
        } catch (deleteError) {
          logger.warn('Failed to delete partial output file', { outputPath, error: deleteError instanceof Error ? deleteError.message : String(deleteError) });
        }
      }
    }

    // Throw a more descriptive error
    if (error instanceof GenerationError) {
      throw error;
    }
    throw new GenerationError(
      `PPTX generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      'Check your markdown content, grid positions, and output permissions',
      outputPath
    );
  } finally {
    // 一時ファイルをクリーンアップ
    for (const file of tempFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          logger.debug('Cleaned up temporary file', { file });
        }
      } catch (cleanupError) {
        logger.warn('Failed to clean up temporary file', { file, error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) });
      }
    }
    // Mermaidの一時ディレクトリをクリーンアップ
    cleanupTempDir();
  }
  });
}

/**
 * 要素をスライドに追加
 */
async function addElement(
  slide: ISlide,
  element: PlacedElement,
  grid: GridConfig,
  slideData: Slide,
  theme: ThemeConfig,
  basePath?: string
): Promise<string[]> {
  logger.debug('Adding element to slide', { type: element.type, position: element.position });

  // グリッド位置を座標に変換
  const coords = gridToCoordinates(element.position, grid, SLIDE_SIZE, MARGIN);
  logger.debug('Converted grid position to coordinates', { position: element.position, coords });

  // スタイルを解決
  const styleProps = element.style?.classes
    ? resolveStyleClasses(element.style.classes, slideData.frontmatter.classes)
    : {};
  logger.debug('Resolved style classes', { classes: element.style?.classes, styleProps });

  // Check plugin generator first
  const pluginGenerator = pluginManager.getElementGenerator(element.type);
  if (pluginGenerator) {
    const context: ElementGeneratorContext = { grid, slideData, theme, basePath, coords, styleProps };
    return await pluginGenerator(element, slide, context);
  }

  // 要素タイプに応じて追加
  switch (element.type) {
    case 'heading':
      logger.debug('Adding heading element');
      addHeadingElement(slide, element, coords, styleProps, theme, (element as any).animation);
      return [];

    case 'paragraph':
      logger.debug('Adding paragraph element');
      addTextElement(slide, element, coords, styleProps, theme, (element as any).animation);
      return [];

    case 'list':
      logger.debug('Adding list element');
      addListElement(slide, element, coords, styleProps, theme, (element as any).animation);
      return [];

    case 'image':
      logger.debug('Adding image element');
      addImageElement(slide, element, coords, styleProps, basePath, (element as any).animation);
      return [];

    case 'video':
      logger.debug('Adding video element');
      addVideoElement(slide, element, coords, styleProps, basePath, (element as any).animation);
      return [];

    case 'table':
      logger.debug('Adding table element');
      addTableElement(slide, element, coords, styleProps, theme, (element as any).animation);
      return [];

    case 'code':
      logger.debug('Adding code element');
      addCodeElement(slide, element, coords, styleProps, theme, (element as any).animation);
      return [];

    case 'blockquote':
      logger.debug('Adding blockquote element');
      addTextElement(slide, element, coords, { ...styleProps, italic: true }, theme);
      return [];

    case 'mermaid':
      logger.debug('Adding mermaid element');
      return await addMermaidElement(slide, element, coords, styleProps, (element as any).animation);

    default:
      throw new GenerationError(
        `Unsupported element type: ${element.type}`,
        undefined,
        'Check your markdown content for valid element types'
      );
  }
}
