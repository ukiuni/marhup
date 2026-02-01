/**
 * Markdownパーサー
 */

import { marked, type Token, type Tokens } from 'marked';
import type {
  SlideElement,
  ListItem,
  TableData,
  ParsedDocument,
  Slide,
  GridPosition,
  StyleOptions,
  GridConfig,
} from '../types/index.js';
import { parseFrontmatter, parseGridString } from './frontmatter.js';
import { extractGridAndStyle, parseBlockGridLine } from './grid.js';
import { pluginManager } from '../utils/plugin-manager.js';
import { sanitizeText } from '../utils/sanitizer.js';
import logger from '../utils/logger.js';

// markedの設定: HTMLはsanitizeTextで除去
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Markdownをパースしてドキュメント構造に変換
 */
export function parseMarkdown(markdown: string): ParsedDocument {
  logger.debug('Starting markdown parsing', { length: markdown.length });

  // グローバルFront Matterを抽出
  const { frontmatter: globalFrontmatter, body } = parseFrontmatter(markdown);
  logger.debug('Parsed global frontmatter', { title: globalFrontmatter.title, theme: globalFrontmatter.theme });

  // スライド区切りで分割
  const slideContents = splitSlides(body);
  logger.debug(`Split into ${slideContents.length} slides`);

  // 各スライドをパース
  const globalGridConfig = globalFrontmatter.grid ? parseGridString(globalFrontmatter.grid) : { cols: 12, rows: 9 };
  const slides = slideContents.map((content) => parseSlide(content, globalFrontmatter.aliases, globalGridConfig));
  logger.info(`Parsed ${slides.length} slides from markdown`);

  return {
    globalFrontmatter,
    slides,
  };
}

/**
 * スライド区切り(---)で分割
 */
function splitSlides(content: string): string[] {
  // 改行 + --- + 改行 をスライド区切りとして扱う
  // ただしFront Matterは除外する
  const slides: string[] = [];
  const slideDelimiter = /\n---\s*\n/g;
  let start = 0;
  let match;

  while ((match = slideDelimiter.exec(content)) !== null) {
    const slide = content.slice(start, match.index).trim();
    if (slide) slides.push(slide);
    start = match.index + match[0].length;
  }

  const lastSlide = content.slice(start).trim();
  if (lastSlide) slides.push(lastSlide);

  return slides;
}

/**
 * 1スライド分のコンテンツをパース
 */
function parseSlide(content: string, globalAliases?: Record<string, string>, globalGridConfig?: GridConfig): Slide {
  logger.debug('Parsing slide content', { contentLength: content.length });

  // スライド個別のFront Matterがあれば抽出
  const { frontmatter, body } = parseFrontmatter(content);

  // aliases をマージ（スライド個別が優先）
  const mergedAliases = { ...globalAliases, ...frontmatter.aliases };

  // grid をマージ（スライド個別が優先）
  const gridConfig = frontmatter.grid ? parseGridString(frontmatter.grid) : globalGridConfig || { cols: 12, rows: 9 };

  // 要素をパース
  const elements = parseSlideElements(body, mergedAliases, gridConfig);
  logger.debug(`Parsed ${elements.length} elements for slide`);

  return {
    frontmatter,
    elements,
  };
}

/**
 * スライド内の要素をパース
 */
function parseSlideElements(content: string, aliases?: Record<string, string>, gridConfig?: GridConfig): SlideElement[] {
  const elements: SlideElement[] = [];

  // グリッドブロックの開始行をすべて見つける
  const gridRegex = /^\s*\[[\d[a-zA-Z_]/gm;
  const gridMatches = [...content.matchAll(gridRegex)];

  // セグメントの境界を決定
  const positions = [0, ...gridMatches.map(m => m.index), content.length];

  for (let i = 0; i < positions.length - 1; i++) {
    const start = positions[i];
    const end = positions[i + 1];
    const segment = content.slice(start, end);

    if (i === 0) {
      // 最初のセグメントはノンブロック
      if (segment.trim()) {
        const blockElements = parseBlockContent(segment, undefined, undefined, aliases, gridConfig);
        elements.push(...blockElements);
      }
    } else {
      // グリッドブロック
      const firstLineEnd = segment.indexOf('\n');
      const firstLine = firstLineEnd >= 0 ? segment.slice(0, firstLineEnd) : segment;
      const { position, style } = parseBlockGridLine(firstLine, aliases, gridConfig);
      const blockContent = firstLineEnd >= 0 ? segment.slice(firstLineEnd + 1) : '';
      const blockElements = parseBlockContent(blockContent, position, style, aliases, gridConfig);
      elements.push(...blockElements);
    }
  }

  return elements;
}

/**
 * 1行をパース（見出しなど、インラインでグリッド指定があるケース）
  const elements: SlideElement[] = [];

  // 見出しチェック
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const { position, style, animation, cleanText } = extractGridAndStyle(headingMatch[2], aliases, gridConfig);

    elements.push({
      type: 'heading',
      level,
      content: cleanText,
      position,
      style,
      animation,
      raw: line,
    });
    return elements;
  }

  // 動画チェック
  const videoMatch = line.match(/^!v\[([^\]]*)\]\(([^)]+)\)(.*)$/);
  if (videoMatch) {
    const _altText = videoMatch[1];
    const src = videoMatch[2];
    const rest = videoMatch[3];
    const { position, style, animation } = extractGridAndStyle(rest, aliases, gridConfig);

    elements.push({
      type: 'video',
      content: src,
      position,
      style,
      animation,
      raw: line,
    });
    return elements;
  }

  // 画像チェック
  const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)(.*)$/);
  if (imageMatch) {
    const altText = imageMatch[1];
    const src = imageMatch[2];
    const rest = imageMatch[3];
    const { position, style, animation } = extractGridAndStyle(rest, aliases, gridConfig);

    elements.push({
      type: 'image',
      content: src,
      position,
      style,
      animation,
      altText: altText || undefined,
      raw: line,
    });
    return elements;
  }

  return elements;
}

/**
 * ブロックコンテンツをパース
 */
function parseBlockContent(
  content: string,
  position?: GridPosition,
  style?: StyleOptions,
  aliases?: Record<string, string>,
  gridConfig?: GridConfig
): SlideElement[] {
  // ブロック内のグリッド記法をチェック
  const gridRegex = /^\s*\[[\d[a-zA-Z_]/gm;
  const gridMatches = [...content.matchAll(gridRegex)];

  if (gridMatches.length > 0) {
    // グリッド記法がある場合、再帰的に処理
    const elements: SlideElement[] = [];
    const positions = [0, ...gridMatches.map(m => m.index), content.length];

    for (let i = 0; i < positions.length - 1; i++) {
      const start = positions[i];
      const end = positions[i + 1];
      const segment = content.slice(start, end);

      if (i === 0) {
        // 最初のセグメントはノンブロック
        if (segment.trim()) {
          const blockElements = parseBlockContent(segment, undefined, style, aliases, gridConfig);
          elements.push(...blockElements);
        }
      } else {
        // グリッドブロック
        const firstLineEnd = segment.indexOf('\n');
        const firstLine = firstLineEnd >= 0 ? segment.slice(0, firstLineEnd) : segment;
        const { position: pos, style: sty } = parseBlockGridLine(firstLine, aliases, gridConfig);
        const blockContent = firstLineEnd >= 0 ? segment.slice(firstLineEnd + 1) : '';
        const blockElements = parseBlockContent(blockContent, pos, sty || style, aliases, gridConfig);
        elements.push(...blockElements);
      }
    }

    // 全体の位置指定がある場合、領域を要素数で分割
    if (position && elements.length > 0) {
      const totalRows = position.rowEnd - position.rowStart + 1;
      const rowsPerElement = Math.max(1, Math.floor(totalRows / elements.length));
      
      let currentRow = position.rowStart;
      
      for (let i = 0; i < elements.length; i++) {
        const isLast = i === elements.length - 1;
        const elementRowEnd = isLast ? position.rowEnd : Math.min(currentRow + rowsPerElement - 1, position.rowEnd);
        
        elements[i].position = {
          colStart: position.colStart,
          colEnd: position.colEnd,
          rowStart: currentRow,
          rowEnd: elementRowEnd,
        };
        
        if (style && !elements[i].style) {
          elements[i].style = style;
        }
        
        currentRow = elementRowEnd + 1;
      }
    }

    return elements;
  } else {
    // 通常のMarkdownパース
    const tokens = marked.lexer(content);
    const blockElements: SlideElement[] = [];
    for (const token of tokens) {
      const element = tokenToElement(token, aliases, gridConfig);
      if (element) {
        blockElements.push(element);
      }
    }

    // 位置指定がある場合、領域を要素数で分割
    if (position && blockElements.length > 0) {
      const totalRows = position.rowEnd - position.rowStart + 1;
      const rowsPerElement = Math.max(1, Math.floor(totalRows / blockElements.length));
      
      let currentRow = position.rowStart;
      
      for (let i = 0; i < blockElements.length; i++) {
        const isLast = i === blockElements.length - 1;
        const elementRowEnd = isLast ? position.rowEnd : Math.min(currentRow + rowsPerElement - 1, position.rowEnd);
        
        blockElements[i].position = {
          colStart: position.colStart,
          colEnd: position.colEnd,
          rowStart: currentRow,
          rowEnd: elementRowEnd,
        };
        
        if (style && !blockElements[i].style) {
          blockElements[i].style = style;
        }
        
        currentRow = elementRowEnd + 1;
      }
    }

    return blockElements;
  }
}

/**
 * marked トークンをSlideElementに変換
 */
function tokenToElement(token: Token, aliases?: Record<string, string>, gridConfig?: GridConfig): SlideElement | null {
  // Check plugin parser first
  const pluginParser = pluginManager.getElementParser(token.type);
  if (pluginParser) {
    const element = pluginParser(token, aliases, gridConfig);
    if (element) return element;
  }

  switch (token.type) {
    case 'heading': {
      const headingToken = token as Tokens.Heading;
      const { position, style, animation, cleanText } = extractGridAndStyle(headingToken.text, aliases, gridConfig);
      return {
        type: 'heading',
        level: headingToken.depth,
        content: sanitizeText(cleanText),
        position,
        style,
        animation,
        raw: headingToken.raw,
      };
    }

    case 'paragraph': {
      const paragraphToken = token as Tokens.Paragraph;
      const { position, style, animation, cleanText } = extractGridAndStyle(paragraphToken.text, aliases, gridConfig);

      // 動画をチェック
      const videoMatch = paragraphToken.text.match(/^!v\[([^\]]*)\]\(([^)]+)\)(.*)$/);
      if (videoMatch) {
        const src = videoMatch[2];
        const rest = videoMatch[3];
        const { position: vidPos, style: vidStyle, animation: vidAnimation } = extractGridAndStyle(rest, aliases, gridConfig);
        return {
          type: 'video',
          content: sanitizeText(src),
          position: vidPos || position,
          style: vidStyle || style,
          animation: vidAnimation || animation,
          raw: paragraphToken.raw,
        };
      }

      // 画像をチェック
      const imageMatch = paragraphToken.text.match(/^!\[([^\]]*)\]\(([^)]+)\)(.*)$/);
      if (imageMatch) {
        const altText = imageMatch[1];
        const src = imageMatch[2];
        const rest = imageMatch[3];
        const { position: imgPos, style: imgStyle, animation: imgAnimation } = extractGridAndStyle(rest, aliases, gridConfig);
        return {
          type: 'image',
          content: sanitizeText(src),
          position: imgPos || position,
          style: imgStyle || style,
          animation: imgAnimation || animation,
          altText: altText || undefined,
          raw: paragraphToken.raw,
        };
      }

      return {
        type: 'paragraph',
        content: sanitizeText(cleanText),
        position,
        style,
        animation,
        raw: paragraphToken.raw,
      };
    }

    case 'list': {
      const listToken = token as Tokens.List;
      const items = parseListItems(listToken.items, listToken.ordered);
      return {
        type: 'list',
        content: items,
        raw: listToken.raw,
      };
    }

    case 'table': {
      const tableToken = token as Tokens.Table;
      const tableData: TableData = {
        headers: tableToken.header.map((h) => sanitizeText(h.text)),
        rows: tableToken.rows.map((row) => row.map((cell) => sanitizeText(cell.text))),
      };
      return {
        type: 'table',
        content: tableData,
        raw: tableToken.raw,
      };
    }

    case 'code': {
      const codeToken = token as Tokens.Code;
      // mermaid記法の場合は別タイプとして扱う
      if (codeToken.lang === 'mermaid') {
        return {
          type: 'mermaid',
          content: sanitizeText(codeToken.text),
          raw: codeToken.raw,
        };
      }
      return {
        type: 'code',
        content: sanitizeText(codeToken.text),
        raw: codeToken.raw,
      };
    }

    case 'blockquote': {
      const blockquoteToken = token as Tokens.Blockquote;
      return {
        type: 'blockquote',
        content: sanitizeText(blockquoteToken.text),
        raw: blockquoteToken.raw,
      };
    }

    case 'html': {
      // HTMLトークンはサニタイズしてテキストとして扱う（念のため）
      const htmlToken = token as Tokens.HTML;
      return {
        type: 'paragraph',
        content: sanitizeText(htmlToken.raw),
        raw: htmlToken.raw,
      };
    }

    default:
      return null;
  }
}

/**
 * リストアイテムをパース
 */
function parseListItems(items: Tokens.ListItem[], ordered: boolean): ListItem[] {
  return items.map((item) => ({
    content: sanitizeText(item.text.split('\n')[0]), // 最初の行のみ
    level: 0,
    ordered,
    children: item.tokens
      ? parseNestedList(item.tokens)
      : undefined,
  }));
}

/**
 * ネストしたリストをパース
 */
function parseNestedList(tokens: Token[]): ListItem[] | undefined {
  const listToken = tokens.find((t) => t.type === 'list') as Tokens.List | undefined;
  if (!listToken) return undefined;
  return parseListItems(listToken.items, listToken.ordered);
}
