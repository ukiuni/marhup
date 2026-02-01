/**
 * テーマインデックスのテスト
 */

import { describe, it, expect, vi } from 'vitest';
import { loadTheme, resolveTheme } from '../src/theme/index.js';
import * as fs from 'fs';

// Mock fs
vi.mock('fs');

const mockFs = fs as any;

describe('loadTheme', () => {
  it('should load theme from YAML file', () => {
    const themeContent = `
fontSize:
  h1: 48
colors:
  text: '#333333'
`;
    const filePath = '/path/to/theme.yaml';

    mockFs.readFileSync.mockReturnValue(themeContent);

    const theme = loadTheme(filePath);
    expect(theme.fontSize?.h1).toBe(48);
    expect(theme.colors?.text).toBe('#333333');
  });

  it('should throw error for invalid YAML', () => {
    const invalidYaml = `invalid: yaml: content:`;
    const filePath = '/path/to/invalid.yaml';

    mockFs.readFileSync.mockReturnValue(invalidYaml);

    expect(() => loadTheme(filePath)).toThrow('Failed to load theme');
  });

  it('should throw error for non-object content', () => {
    const nonObjectContent = `just a string`;
    const filePath = '/path/to/string.yaml';

    mockFs.readFileSync.mockReturnValue(nonObjectContent);

    expect(() => loadTheme(filePath)).toThrow('Theme file must contain an object');
  });
});

describe('resolveTheme', () => {
  it('should resolve theme from frontmatter', () => {
    const frontmatter = {
      theme: 'custom',
      themeFile: '/path/to/custom.yaml',
    };

    const customTheme = {
      colors: {
        text: '#ff0000',
      },
    };

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(`
colors:
  text: '#ff0000'
`);

    const theme = resolveTheme(frontmatter.theme);
    expect(theme.colors.text).toBe('#ff0000');
  });

  it('should return default theme when no theme specified', () => {
    const frontmatter = {};

    const theme = resolveTheme(frontmatter);
    expect(theme).toBeDefined();
    expect(theme.colors).toBeDefined();
  });

  it('should handle missing theme file', () => {
    const frontmatter = {
      themeFile: '/nonexistent/theme.yaml',
    };

    mockFs.existsSync.mockReturnValue(false);

    const theme = resolveTheme(frontmatter.themeFile);
    expect(theme).toBeDefined(); // Should fall back to default
  });
});