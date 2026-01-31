/**
 * md2ppt - Markdown to PowerPoint converter
 * メインエクスポート
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseMarkdown } from './parser/index.js';
import { generatePptx } from './generator/index.js';
import type { ConvertOptions, ParsedDocument } from './types/index.js';

/**
 * MarkdownからPPTXを生成
 */
export async function md2ppt(
  markdown: string,
  options: ConvertOptions
): Promise<void> {
  // パース
  const document = parseMarkdown(markdown);

  // PPTX生成
  await generatePptx(document, options.output, options.basePath);
}

/**
 * MarkdownファイルからPPTXを生成
 */
export async function md2pptFile(
  inputPath: string,
  options: ConvertOptions
): Promise<void> {
  const markdown = fs.readFileSync(inputPath, 'utf-8');
  // 入力ファイルのディレクトリをベースパスとして設定
  const basePath = options.basePath || path.dirname(path.resolve(inputPath));
  await md2ppt(markdown, { ...options, basePath });
}

/**
 * Markdownをパースして構造を返す（デバッグ用）
 */
export function parse(markdown: string): ParsedDocument {
  return parseMarkdown(markdown);
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
export default md2ppt;
