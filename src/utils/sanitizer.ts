import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import type { SlideElement } from '../types/index.js';

// DOMPurifyのセットアップ
const window = new JSDOM('').window;
const DOMPurifyInstance = DOMPurify(window);

/**
 * テキストコンテンツをサニタイズ
 */
export function sanitizeText(text: string): string {
  // HTMLタグを除去し、テキストのみを返す
  return DOMPurifyInstance.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * SVGコンテンツをサニタイズ
 */
export function sanitizeSvg(svgContent: string): string {
  // SVGの安全なタグのみを許可
  return DOMPurifyInstance.sanitize(svgContent, {
    ALLOWED_TAGS: [
      'svg', 'g', 'path', 'circle', 'rect', 'text', 'line', 'polyline', 'polygon', 'ellipse',
      'defs', 'linearGradient', 'radialGradient', 'stop', 'use', 'symbol', 'clipPath', 'mask'
    ],
    ALLOWED_ATTR: [
      'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'fill', 'stroke',
      'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'transform', 'viewBox', 'xmlns',
      'version', 'id', 'class', 'points', 'rx', 'ry', 'offset', 'stop-color', 'stop-opacity',
      'gradientUnits', 'gradientTransform', 'href', 'clip-path', 'mask'
    ],
  });
}

/**
 * SlideElementのcontentをサニタイズ
 */
export function sanitizeElement(element: SlideElement): void {
  switch (element.type) {
    case 'heading':
    case 'paragraph':
    case 'code':
    case 'blockquote':
    case 'mermaid':
    case 'image':
    case 'video':
      if (typeof element.content === 'string') {
        element.content = sanitizeText(element.content);
      }
      break;
    case 'list':
      if (Array.isArray(element.content)) {
        element.content.forEach(item => {
          item.content = sanitizeText(item.content);
          if (item.children) {
            item.children.forEach(child => {
              child.content = sanitizeText(child.content);
            });
          }
        });
      }
      break;
    case 'table':
      if (element.content && typeof element.content === 'object' && 'headers' in element.content && 'rows' in element.content) {
        element.content.headers = element.content.headers.map(sanitizeText);
        element.content.rows = element.content.rows.map(row => row.map(sanitizeText));
      }
      break;
    default:
      // プラグインなどのカスタム要素もcontentがstringならサニタイズ
      if (typeof element.content === 'string') {
        element.content = sanitizeText(element.content);
      }
      break;
  }
}