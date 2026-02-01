/**
 * YAML Front Matter パーサー
 */

import YAML from 'yaml';
import type { SlideFrontmatter, ThemeConfig, AnimationConfig, SlideTransitionConfig } from '../types/index.js';
import { FrontmatterError } from '../errors.js';

/**
 * Front Matterの構造を検証
 */
function validateFrontmatter(frontmatter: Record<string, unknown>): SlideFrontmatter {
  const validated: SlideFrontmatter = {};

  for (const [key, value] of Object.entries(frontmatter)) {
    switch (key) {
      case 'title':
        if (typeof value !== 'string') {
          throw new FrontmatterError(
            `'title' must be a string, got ${typeof value}`,
            'title',
            value,
            'Use a string value for the title, e.g., title: "My Presentation"'
          );
        }
        validated.title = value;
        break;
      case 'grid':
        if (typeof value !== 'string') {
          throw new FrontmatterError(
            `'grid' must be a string, got ${typeof value}`,
            'grid',
            value,
            'Use a grid size string like "12x9" or "16x10"'
          );
        }
        validated.grid = value;
        break;
      case 'layout':
        if (typeof value !== 'string') {
          throw new FrontmatterError(
            `'layout' must be a string, got ${typeof value}`,
            'layout',
            value,
            'Use "auto" for automatic layout or "manual" for custom positioning'
          );
        }
        validated.layout = value;
        break;
      case 'theme':
        if (typeof value === 'string') {
          validated.theme = value;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Allow partial theme overrides
          validated.theme = value as Partial<ThemeConfig>;
        } else {
          throw new FrontmatterError(
            `'theme' must be a string or an object, got ${typeof value}`,
            'theme',
            value,
            'Use a theme name like "default" or an object with theme properties'
          );
        }
        break;
      case 'classes':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new FrontmatterError(
            `'classes' must be an object, got ${typeof value}`,
            'classes',
            value,
            'Use an object with class names as keys and style objects as values'
          );
        }
        for (const [className, classProps] of Object.entries(value)) {
          if (typeof classProps !== 'object' || classProps === null || Array.isArray(classProps)) {
            throw new FrontmatterError(
              `Class '${className}' must be an object, got ${typeof classProps}`,
              `classes.${className}`,
              classProps,
              'Each class should be an object with CSS properties'
            );
          }
        }
        validated.classes = value as Record<string, Record<string, unknown>>;
        break;
      case 'aliases':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new FrontmatterError(
            `'aliases' must be an object, got ${typeof value}`,
            'aliases',
            value,
            'Use an object with alias names as keys and grid positions as values'
          );
        }
        for (const [aliasKey, aliasValue] of Object.entries(value)) {
          if (typeof aliasValue !== 'string') {
            throw new FrontmatterError(
              `Alias '${aliasKey}' must be a string, got ${typeof aliasValue}`,
              `aliases.${aliasKey}`,
              aliasValue,
              'Each alias should be a grid position string like "[1-6,1-4]"'
            );
          }
        }
        validated.aliases = value as Record<string, string>;
        break;
      case 'animations':
        if (!Array.isArray(value)) {
          throw new FrontmatterError(
            `'animations' must be an array, got ${typeof value}`,
            'animations',
            value,
            'Use an array of animation objects'
          );
        }
        // Basic validation - more detailed validation can be added later
        validated.animations = value as AnimationConfig[];
        break;
      case 'transition':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new FrontmatterError(
            `'transition' must be an object, got ${typeof value}`,
            'transition',
            value,
            'Use an object with transition properties like { type: "fade", duration: 1, direction: "left" }'
          );
        }
        // Basic validation - more detailed validation can be added later
        validated.transition = value as SlideTransitionConfig;
        break;
      default:
        // その他のキーはそのまま
        validated[key] = value;
        break;
    }
  }

  return validated;
}

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
    const parsed = YAML.parse(yamlContent) || {};
    const frontmatter = validateFrontmatter(parsed);
    return { frontmatter, body };
  } catch (error) {
    if (error instanceof FrontmatterError) {
      // Validation error - re-throw with file context
      throw new FrontmatterError(
        error.message,
        error.code,
        undefined,
        'Check your YAML syntax and ensure all values have correct types',
        undefined, // filePath will be added by caller
        undefined // lineNumber
      );
    }
    // YAML parsing error
    throw new FrontmatterError(
      `Invalid YAML syntax: ${error instanceof Error ? error.message : 'Unknown YAML error'}`,
      undefined,
      undefined,
      'Check your YAML syntax. Ensure proper indentation and valid YAML format.',
      undefined,
      undefined
    );
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
