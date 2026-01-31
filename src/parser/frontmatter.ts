/**
 * YAML Front Matter パーサー
 */

import YAML from 'yaml';
import type { SlideFrontmatter } from '../types/index.js';

/**
 * Front Matterを抽出してパース
 */
export function parseFrontmatter(content: string): {
  frontmatter: SlideFrontmatter;
  body: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      body: content,
    };
  }

  const yamlContent = match[1];
  const body = content.slice(match[0].length);

  try {
    const frontmatter = YAML.parse(yamlContent) || {};
    return { frontmatter, body };
  } catch (error) {
    console.warn('Front Matterのパースに失敗しました:', error);
    return {
      frontmatter: {},
      body: content,
    };
  }
}

/**
 * グリッド文字列をパース
 */
export function parseGridString(gridStr: string): { cols: number; rows: number } {
  const match = gridStr.match(/^(\d+)\s*x\s*(\d+)$/i);
  if (!match) {
    return { cols: 12, rows: 9 };
  }
  return {
    cols: parseInt(match[1], 10),
    rows: parseInt(match[2], 10),
  };
}
