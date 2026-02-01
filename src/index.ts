/**
 * marhup - Markdown to PowerPoint converter
 * メインエクスポート
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseMarkdown } from './parser/index.js';
import { generatePptx } from './generator/index.js';
import { layoutSlide } from './layout/engine.js';
import type { SlideElement } from './types/index.js';
import { parseGridString } from './parser/frontmatter.js';
import type { ConvertOptions, ParsedDocument } from './types/index.js';
import { pluginManager } from './utils/plugin-manager.js';
import logger from './utils/logger.js';

/**
 * MarkdownからPPTXを生成
 */
export async function marhup(
  markdown: string,
  options: ConvertOptions
): Promise<void> {
  logger.info('Starting PPTX generation', { output: options.output, basePath: options.basePath });

  try {
    // Load plugins
    if (options.pluginDir) {
      await pluginManager.loadPlugins(options.pluginDir);
      await pluginManager.init({ logger, options });
    }

    // パース
    logger.debug('Parsing markdown content');
    const document = parseMarkdown(markdown);
    logger.info(`Parsed document with ${document.slides.length} slides`);

    // Execute onParse hooks
    await pluginManager.executeHook('onParse', document);

    // CLIオプションでデフォルトグリッドを設定
    if (options.grid && !document.globalFrontmatter.grid) {
      document.globalFrontmatter.grid = options.grid;
      logger.debug(`Set default grid to ${options.grid}`);
    }

    // CLIオプションでデフォルトテーマを設定
    if (options.theme && !document.globalFrontmatter.theme) {
      document.globalFrontmatter.theme = options.theme;
      logger.debug(`Set default theme to ${options.theme}`);
    }

    // PPTX生成
    logger.debug('Generating PPTX file');
    await generatePptx(document, options.output, options.basePath);
    logger.info('PPTX generation completed successfully');
  } catch (error) {
    logger.error('PPTX generation failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * MarkdownファイルからPPTXを生成
 */
export async function marhupFile(
  inputPath: string,
  options: ConvertOptions
): Promise<void> {
  logger.info('Processing markdown file', { inputPath, output: options.output });

  try {
    const markdown = fs.readFileSync(inputPath, 'utf-8');
    logger.debug(`Read ${markdown.length} characters from input file`);

    // メモリ解放のため、処理後にnull化
    const basePath = options.basePath || path.dirname(inputPath);
    logger.debug(`Using base path: ${basePath}`);

    await marhup(markdown, { ...options, basePath });
    // markdownをnull化してGCを助ける
  } catch (error) {
    logger.error('File processing failed', { inputPath, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Markdownをパースして構造を返す（デバッグ用）
 */
export function parse(markdown: string): ParsedDocument {
  return parseMarkdown(markdown);
}

/**
 * グリッドマップをテキストで表示
 */
function printGridMap(gridMap: { occupied: boolean; elementIndex?: number }[][], elements: SlideElement[]): void {
  const rows = gridMap.length;
  const cols = gridMap[0]?.length || 0;
  
  console.log(`  Layout (${cols}x${rows}):`);
  
  // 上辺
  console.log('  +' + '-'.repeat(cols * 2 + 1) + '+');
  
  for (let row = 0; row < rows; row++) {
    let line = '  |';
    for (let col = 0; col < cols; col++) {
      const cell = gridMap[row][col];
      if (cell.occupied && cell.elementIndex !== undefined) {
        const element = elements[cell.elementIndex];
        const typeChar = getElementTypeChar(element.type);
        line += ` ${typeChar}`;
      } else {
        line += '  ';
      }
      line += '|';
    }
    console.log(line);
    
    // 行区切り（最後の行以外）
    if (row < rows - 1) {
      console.log('  +' + '-'.repeat(cols * 2 + 1) + '+');
    }
  }
  
  // 下辺
  console.log('  +' + '-'.repeat(cols * 2 + 1) + '+');
}

/**
 * 要素タイプを1文字で表現
 */
function getElementTypeChar(type: string): string {
  switch (type) {
    case 'heading': return 'H';
    case 'paragraph': return 'P';
    case 'list': return 'L';
    case 'image': return 'I';
    case 'video': return 'V';
    case 'table': return 'T';
    case 'code': return 'C';
    case 'blockquote': return 'Q';
    case 'mermaid': return 'M';
    default: return '?';
  }
}

/**
 * Markdownのレイアウトをプレビュー表示
 */
export function previewLayout(markdown: string, options: { grid?: string } = {}): void {
  const document = parseMarkdown(markdown);
  const globalFrontmatter = document.globalFrontmatter;
  const defaultGrid = options.grid || globalFrontmatter.grid || '12x9';

  console.log('📋 Layout Preview\n');

  document.slides.forEach((slide, slideIndex) => {
    console.log(`Slide ${slideIndex + 1}:`);
    
    // グリッド設定を決定
    const gridStr = slide.frontmatter.grid || defaultGrid;
    const grid = parseGridString(gridStr);
    
    console.log(`  Grid: ${grid.cols}x${grid.rows}`);
    
    // レイアウト計算
    const layoutResult = layoutSlide(slide, globalFrontmatter);
    
    // グリッドマップを表示
    printGridMap(layoutResult.gridMap, slide.elements);
    
    // 要素リストを表示
    console.log('  Elements:');
    layoutResult.elements.forEach((element, index) => {
      const pos = element.position;
      const type = element.type.toUpperCase();
      const content = typeof element.content === 'string' 
        ? element.content.substring(0, 50) + (element.content.length > 50 ? '...' : '')
        : `[${element.type}]`;
      console.log(`    ${index + 1}. ${type} [${pos.colStart}-${pos.colEnd}, ${pos.rowStart}-${pos.rowEnd}]: ${content}`);
    });
    
    console.log('');
  });
}
export async function marhupFromJson(
  jsonPath: string,
  options: ConvertOptions
): Promise<void> {
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const document: ParsedDocument = JSON.parse(jsonContent);
  await generatePptx(document, options.output, options.basePath);
}

// 型のエクスポート
export type {
  ConvertOptions,
  ParsedDocument,
  Slide,
  SlideElement,
  GridPosition,
  StyleOptions,
  ThemeConfig,
} from './types/index.js';

// デフォルトエクスポート
export default marhup;
