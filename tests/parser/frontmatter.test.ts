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

  it('should throw error for invalid YAML syntax', () => {
    const content = `---
invalid: yaml: content:
---

# Content
`;

    expect(() => parseFrontmatter(content)).toThrow('Front Matter error: Invalid YAML syntax');
  });

  it('should throw error for invalid classes structure', () => {
    const content = `---
classes: not-an-object
---

# Content
`;

    expect(() => parseFrontmatter(content)).toThrow('Front Matter validation failed for \'classes\': \'classes\' must be an object, got string');
  });

  it('should throw error for invalid class properties', () => {
    const content = `---
classes:
  myclass: not-an-object
---

# Content
`;

    expect(() => parseFrontmatter(content)).toThrow('Front Matter validation failed for \'classes.myclass\': Class \'myclass\' must be an object, got string');
  });

  it('should throw error for invalid aliases structure', () => {
    const content = `---
aliases: not-an-object
---

# Content
`;

    expect(() => parseFrontmatter(content)).toThrow('Front Matter validation failed for \'aliases\': \'aliases\' must be an object, got string');
  });

  it('should throw error for invalid alias value', () => {
    const content = `---
aliases:
  key: 123
---

# Content
`;

    expect(() => parseFrontmatter(content)).toThrow('Front Matter validation failed for \'aliases.key\': Alias \'key\' must be a string, got number');
  });

  it('should parse transition configuration', () => {
    const content = `---
title: Test
transition:
  type: fade
  duration: 1
  direction: left
  speed: medium
---

# Content
`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.transition).toEqual({
      type: 'fade',
      duration: 1,
      direction: 'left',
      speed: 'medium',
    });
  });

  it('should throw error for invalid transition structure', () => {
    const content = `---
transition: not-an-object
---

# Content
`;

    expect(() => parseFrontmatter(content)).toThrow('Front Matter validation failed for \'transition\': \'transition\' must be an object, got string');
  });
});