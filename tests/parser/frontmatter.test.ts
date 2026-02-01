/**
 * Front Matter パーサーのテスト
 */

import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../../src/parser/frontmatter';

describe('parseFrontmatter', () => {
  it('should parse basic frontmatter', () => {
    const content = `---
title: Test Title
grid: 12x9
---

# Content
`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({
      title: 'Test Title',
      grid: '12x9',
    });
    expect(result.body).toBe('# Content\n');
  });

  it('should parse custom classes', () => {
    const content = `---
title: Test
classes:
  myclass:
    color: '#ff0000'
    bold: true
  another:
    fontSize: 24
---

# Content
`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.classes).toEqual({
      myclass: {
        color: '#ff0000',
        bold: true,
      },
      another: {
        fontSize: 24,
      },
    });
  });

  it('should handle empty frontmatter', () => {
    const content = '# Content';
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('# Content');
  });

  it('should handle invalid YAML gracefully', () => {
    const content = `---
invalid: yaml: content:
---

# Content
`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe(content);
  });
});