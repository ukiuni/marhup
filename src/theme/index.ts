/**
 * テーマモジュール
 */

import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { ThemeConfig } from '../types/index.js';
import { defaultTheme } from './default.js';
import { validateAndResolvePath } from '../utils/path-validation.js';

export { defaultTheme, styleClasses, resolveStyleClasses } from './default.js';
export { loadTheme };
export { resolveTheme };

/**
 * YAMLファイルからテーマをロード
 */
function loadTheme(filePath: string, basePath?: string): Partial<ThemeConfig> {
  try {
    const resolvedPath = basePath ? validateAndResolvePath(filePath, basePath) : path.resolve(filePath);
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const parsed = YAML.parse(content);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Theme file must contain an object');
    }
    return parsed as Partial<ThemeConfig>;
  } catch (error) {
    throw new Error(`Failed to load theme from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * ディープマージ関数
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      if (sourceValue !== undefined) {
        if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue) && typeof result[key] === 'object' && result[key] !== null) {
          result[key] = deepMerge(result[key] as Record<string, unknown>, sourceValue as Record<string, unknown>);
        } else {
          result[key] = sourceValue;
        }
      }
    }
  }
  return result;
}

/**
 * Front Matterからテーマを解決
 */
function resolveTheme(themeValue: string | Partial<ThemeConfig> | undefined, basePath?: string): ThemeConfig {
  if (!themeValue) {
    return defaultTheme;
  }

  if (typeof themeValue === 'string') {
    if (themeValue === 'default') {
      return defaultTheme;
    }

    // Try to load as YAML file
    try {
      const customTheme = loadTheme(themeValue, basePath);
      return deepMerge(defaultTheme as unknown as Record<string, unknown>, customTheme) as unknown as ThemeConfig;
    } catch (error) {
      console.warn(`Failed to load theme from ${themeValue}: ${error instanceof Error ? error.message : String(error)}`);
      console.warn('Using default theme');
      return defaultTheme;
    }
  }

  // Merge partial theme with default
  return deepMerge(defaultTheme as unknown as Record<string, unknown>, themeValue) as unknown as ThemeConfig;
}
