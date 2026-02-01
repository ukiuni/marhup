/**
 * Mermaid要素パーサーのテスト
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/parser/markdown';

describe('Mermaid パーサー', () => {
  it('mermaidコードブロックをmermaidタイプとして認識する', () => {
    const markdown = `
\`\`\`mermaid
graph TD
    A[Start] --> B[End]
\`\`\`
`;
    const result = parseMarkdown(markdown);
    expect(result.slides.length).toBe(1);
    expect(result.slides[0].elements.length).toBe(1);
    expect(result.slides[0].elements[0].type).toBe('mermaid');
    expect(result.slides[0].elements[0].content).toContain('graph TD');
  });

  it('通常のコードブロックはcodeタイプのまま', () => {
    const markdown = `
\`\`\`javascript
console.log('hello');
\`\`\`
`;
    const result = parseMarkdown(markdown);
    expect(result.slides.length).toBe(1);
    expect(result.slides[0].elements.length).toBe(1);
    expect(result.slides[0].elements[0].type).toBe('code');
  });

  it('言語指定なしのコードブロックはcodeタイプ', () => {
    const markdown = `
\`\`\`
plain text
\`\`\`
`;
    const result = parseMarkdown(markdown);
    expect(result.slides.length).toBe(1);
    expect(result.slides[0].elements.length).toBe(1);
    expect(result.slides[0].elements[0].type).toBe('code');
  });

  it('グリッドブロック内のmermaidも認識する', () => {
    const markdown = `
[1-6, 2-8]
\`\`\`mermaid
sequenceDiagram
    A->>B: Hello
\`\`\`
`;
    const result = parseMarkdown(markdown);
    expect(result.slides.length).toBe(1);
    expect(result.slides[0].elements.length).toBe(1);
    expect(result.slides[0].elements[0].type).toBe('mermaid');
    expect(result.slides[0].elements[0].position).toEqual({
      colStart: 1,
      colEnd: 6,
      rowStart: 2,
      rowEnd: 8,
    });
  });
});
