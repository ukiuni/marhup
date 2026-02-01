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
} from '../types/index';
import { parseFrontmatter } from './frontmatter';
import { extractGridAndStyle, parseBlockGridLine } from './grid';

/**
 * Markdownをパースしてドキュメント構造に変換
 */
export function parseMarkdown(markdown: string): ParsedDocument {
  // グローバルFront Matterを抽出
  const { frontmatter: globalFrontmatter, body } = parseFrontmatter(markdown);

  // スライド区切りで分割
  const slideContents = splitSlides(body);

  // 各スライドをパース
  const slides = slideContents.map((content) => parseSlide(content));

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
  const slideDelimiter = /\n---\s*\n/;
  return content.split(slideDelimiter).filter((s) => s.trim().length > 0);
}

/**
 * 1スライド分のコンテンツをパース
 */
function parseSlide(content: string): Slide {
  // スライド個別のFront Matterがあれば抽出
  const { frontmatter, body } = parseFrontmatter(content);

  // 要素をパース
  const elements = parseSlideElements(body);

  return {
    frontmatter,
    elements,
  };
}

/**
 * スライド内の要素をパース
 */
function parseSlideElements(content: string): SlideElement[] {
  const elements: SlideElement[] = [];
  const lines = content.split('\n');

  let currentBlock: {
    position?: GridPosition;
    style?: StyleOptions;
    lines: string[];
  } | null = null;

  let nonBlockLines: string[] = [];

  const flushNonBlockLines = () => {
    if (nonBlockLines.length > 0) {
      const blockContent = nonBlockLines.join('\n');
      if (blockContent.trim()) {
        const blockElements = parseBlockContent(blockContent, undefined, undefined);
        elements.push(...blockElements);
      }
      nonBlockLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // グリッドブロックの開始をチェック
    const { isGridBlock, position, style } = parseBlockGridLine(line);

    if (isGridBlock) {
      // 前のノンブロック行があれば処理
      flushNonBlockLines();
      
      // 前のグリッドブロックがあれば処理
      if (currentBlock && currentBlock.lines.length > 0) {
        const blockElements = parseBlockContent(
          currentBlock.lines.join('\n'),
          currentBlock.position,
          currentBlock.style
        );
        elements.push(...blockElements);
      }

      // 新しいブロックを開始
      currentBlock = {
        position,
        style,
        lines: [],
      };
      continue;
    }

    // 現在のグリッドブロックに行を追加
    if (currentBlock) {
      currentBlock.lines.push(line);
    } else {
      // ブロック外の行はまとめておく
      nonBlockLines.push(line);
    }
  }

  // 最後のノンブロック行を処理
  flushNonBlockLines();

  // 最後のグリッドブロックを処理
  if (currentBlock && currentBlock.lines.length > 0) {
    const blockElements = parseBlockContent(
      currentBlock.lines.join('\n'),
      currentBlock.position,
      currentBlock.style
    );
    elements.push(...blockElements);
  }

  return elements;
}

/**
 * 1行をパース（見出しなど、インラインでグリッド指定があるケース）
 */
function _parseLine(line: string): SlideElement[] {
  const elements: SlideElement[] = [];

  // 見出しチェック
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const { position, style, cleanText } = extractGridAndStyle(headingMatch[2]);

    elements.push({
      type: 'heading',
      level,
      content: cleanText,
      position,
      style,
      raw: line,
    });
    return elements;
  }

  // 画像チェック
  const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)(.*)$/);
  if (imageMatch) {
    const _altText = imageMatch[1];
    const src = imageMatch[2];
    const rest = imageMatch[3];
    const { position, style } = extractGridAndStyle(rest);

    elements.push({
      type: 'image',
      content: src,
      position,
      style,
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
  style?: StyleOptions
): SlideElement[] {
  const elements: SlideElement[] = [];
  const tokens = marked.lexer(content);

  // グリッドブロック内の要素を収集
  const blockElements: SlideElement[] = [];
  for (const token of tokens) {
    const element = tokenToElement(token);
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
      const element = blockElements[i];
      const isLast = i === blockElements.length - 1;
      const elementRowEnd = isLast ? position.rowEnd : Math.min(currentRow + rowsPerElement - 1, position.rowEnd);
      
      element.position = {
        colStart: position.colStart,
        colEnd: position.colEnd,
        rowStart: currentRow,
        rowEnd: elementRowEnd,
      };
      
      if (style && !element.style) {
        element.style = style;
      }
      
      elements.push(element);
      currentRow = elementRowEnd + 1;
    }
  } else {
    // 位置指定がない場合はそのまま追加
    elements.push(...blockElements);
  }

  return elements;
}

/**
 * marked トークンをSlideElementに変換
 */
function tokenToElement(token: Token): SlideElement | null {
  switch (token.type) {
    case 'heading': {
      const headingToken = token as Tokens.Heading;
      const { position, style, cleanText } = extractGridAndStyle(headingToken.text);
      return {
        type: 'heading',
        level: headingToken.depth,
        content: cleanText,
        position,
        style,
        raw: headingToken.raw,
      };
    }

    case 'paragraph': {
      const paragraphToken = token as Tokens.Paragraph;
      const { position, style, cleanText } = extractGridAndStyle(paragraphToken.text);

      // 画像をチェック
      const imageMatch = paragraphToken.text.match(/^!\[([^\]]*)\]\(([^)]+)\)(.*)$/);
      if (imageMatch) {
        const src = imageMatch[2];
        const rest = imageMatch[3];
        const { position: imgPos, style: imgStyle } = extractGridAndStyle(rest);
        return {
          type: 'image',
          content: src,
          position: imgPos || position,
          style: imgStyle || style,
          raw: paragraphToken.raw,
        };
      }

      return {
        type: 'paragraph',
        content: cleanText,
        position,
        style,
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
        headers: tableToken.header.map((h) => h.text),
        rows: tableToken.rows.map((row) => row.map((cell) => cell.text)),
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
          content: codeToken.text,
          raw: codeToken.raw,
        };
      }
      return {
        type: 'code',
        content: codeToken.text,
        raw: codeToken.raw,
      };
    }

    case 'blockquote': {
      const blockquoteToken = token as Tokens.Blockquote;
      return {
        type: 'blockquote',
        content: blockquoteToken.text,
        raw: blockquoteToken.raw,
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
    content: item.text.split('\n')[0], // 最初の行のみ
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
