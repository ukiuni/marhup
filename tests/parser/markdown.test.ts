/**
 * Markdownパーサーのテスト
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/parser/markdown.js';

describe('parseMarkdown', () => {
  it('Front Matterを解析できる', () => {
    const md = `---
title: テスト
grid: 12x9
---

# スライド1
`;
    const result = parseMarkdown(md);
    expect(result.globalFrontmatter.title).toBe('テスト');
    expect(result.globalFrontmatter.grid).toBe('12x9');
  });

  it('スライドを分割できる', () => {
    const md = `# スライド1

---

# スライド2

---

# スライド3
`;
    const result = parseMarkdown(md);
    expect(result.slides).toHaveLength(3);
  });

  it('見出しを解析できる', () => {
    const md = `# タイトル

## サブタイトル
`;
    const result = parseMarkdown(md);
    const elements = result.slides[0].elements;

    // 見出しがパースされていることを確認
    const h1 = elements.find((e) => e.type === 'heading' && e.level === 1);
    expect(h1).toBeDefined();
    expect(h1?.content).toContain('タイトル');

    const h2 = elements.find((e) => e.type === 'heading' && e.level === 2);
    expect(h2).toBeDefined();
    expect(h2?.content).toContain('サブタイトル');
  });

  it('グリッドブロックを解析できる', () => {
    const md = `[1-6, 2-8]
## 左側
- 項目1
- 項目2

[7-12, 2-8]
## 右側
テキスト
`;
    const result = parseMarkdown(md);
    const elements = result.slides[0].elements;

    // 左側ブロックの最初の要素
    const leftBlock = elements.find(
      (e) => e.position?.colStart === 1 && e.position?.colEnd === 6
    );
    expect(leftBlock).toBeDefined();

    // 右側ブロックの最初の要素
    const rightBlock = elements.find(
      (e) => e.position?.colStart === 7 && e.position?.colEnd === 12
    );
    expect(rightBlock).toBeDefined();
  });

  it('リストを解析できる', () => {
    const md = `- 項目1
- 項目2
- 項目3
`;
    const result = parseMarkdown(md);
    const elements = result.slides[0].elements;
    const listElement = elements.find((e) => e.type === 'list');

    expect(listElement).toBeDefined();
    expect(Array.isArray(listElement?.content)).toBe(true);
    if (Array.isArray(listElement?.content)) {
      expect(listElement.content).toHaveLength(3);
    }
  });

  it('テーブルを解析できる', () => {
    const md = `| Header1 | Header2 |
|---------|---------|
| Cell1   | Cell2   |
| Cell3   | Cell4   |
`;
    const result = parseMarkdown(md);
    const elements = result.slides[0].elements;
    const tableElement = elements.find((e) => e.type === 'table');

    expect(tableElement).toBeDefined();
    expect(typeof tableElement?.content).toBe('object');
    if (typeof tableElement?.content === 'object' && 'headers' in tableElement.content) {
      expect(tableElement.content.headers).toEqual(['Header1', 'Header2']);
      expect(tableElement.content.rows).toHaveLength(2);
    }
  });

  it('画像を解析できる', () => {
    const md = `![Alt text](image.jpg)
`;
    const result = parseMarkdown(md);
    const elements = result.slides[0].elements;
    const imageElement = elements.find((e) => e.type === 'image');

    expect(imageElement).toBeDefined();
    expect(imageElement?.content).toBe('image.jpg');
  });

  it('動画を解析できる', () => {
    const md = `!v[Alt text](video.mp4)
`;
    const result = parseMarkdown(md);
    const elements = result.slides[0].elements;
    const videoElement = elements.find((e) => e.type === 'video');

    expect(videoElement).toBeDefined();
    expect(videoElement?.content).toBe('video.mp4');
  });

  it('should handle invalid grid position gracefully', () => {
    const md = `# Title [13, 1]

Content
`;
    // Should throw GridError for invalid position
    expect(() => parseMarkdown(md)).toThrow();
  });

  it('should handle malformed frontmatter', () => {
    const md = `---
invalid: yaml: syntax:
---

# Content
`;
    // Should handle gracefully or throw appropriate error
    expect(() => parseMarkdown(md)).toThrow();
  });

  it('should handle empty markdown', () => {
    const result = parseMarkdown('');
    expect(result.slides).toHaveLength(0);
    expect(result.globalFrontmatter).toEqual({});
  });

  it('should handle markdown with only frontmatter', () => {
    const md = `---
title: Test
---
`;
    const result = parseMarkdown(md);
    expect(result.slides).toHaveLength(0);
    expect(result.globalFrontmatter.title).toBe('Test');
  });
});
