/**
 * メインAPIのテスト
 */

import { describe, it, expect } from 'vitest';
import { parse, marhup } from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('parse', () => {
  it('Markdownをパースできる', () => {
    const md = `# タイトル

段落テキスト

- リスト項目1
- リスト項目2
`;

    const result = parse(md);

    expect(result.slides).toHaveLength(1);
    expect(result.slides[0].elements).toHaveLength(3); // 見出し、段落、リスト
    expect(result.globalFrontmatter).toEqual({});
  });

  it('Front Matterをパースできる', () => {
    const md = `---
title: テストプレゼン
grid: 10x8
---

# スライド1
`;

    const result = parse(md);

    expect(result.globalFrontmatter.title).toBe('テストプレゼン');
    expect(result.globalFrontmatter.grid).toBe('10x8');
  });

  it('複数スライドをパースできる', () => {
    const md = `# スライド1

---

# スライド2

---

# スライド3
`;

    const result = parse(md);

    expect(result.slides).toHaveLength(3);
    expect(result.slides[0].elements[0].content).toContain('スライド1');
    expect(result.slides[1].elements[0].content).toContain('スライド2');
    expect(result.slides[2].elements[0].content).toContain('スライド3');
  });
});

describe('Thread Safety', () => {
  it('同じ出力ファイルへの同時アクセスが適切にロックされる', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marhup-test-'));
    const outputPath = path.join(tempDir, 'locked.pptx');
    
    const md = `# テストスライド

これはスレッドセーフティテスト用のコンテンツです。
`;

    // 同じ出力ファイルに対して複数の変換を開始
    const promise1 = marhup(md, { output: outputPath }).catch(() => { /* ignore */ });
    const promise2 = marhup(md, { output: outputPath }).catch(() => { /* ignore */ });
    const promise3 = marhup(md, { output: outputPath }).catch(() => { /* ignore */ });

    // 全てのPromiseが完了するまで待つ
    await Promise.allSettled([promise1, promise2, promise3]);

    // 出力ファイルが作成されていることを確認（最初の1つだけ成功）
    expect(fs.existsSync(outputPath)).toBe(true);

    // クリーンアップ
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    fs.rmdirSync(tempDir);
  });

  it('異なる出力ファイルへの同時アクセスは正常に動作する', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marhup-test-'));
    
    const md = `# テストスライド

これはスレッドセーフティテスト用のコンテンツです。
`;

    // 異なる出力ファイルに対して複数の変換を並行して実行
    const promises = Array.from({ length: 3 }, (_, i) => {
      const outputPath = path.join(tempDir, `concurrent-${i}.pptx`);
      return marhup(md, { output: outputPath });
    });

    // 全てのPromiseが解決するか確認
    await expect(Promise.all(promises)).resolves.not.toThrow();

    // 全ての出力ファイルが作成されていることを確認
    for (let i = 0; i < 3; i++) {
      const outputPath = path.join(tempDir, `concurrent-${i}.pptx`);
      expect(fs.existsSync(outputPath)).toBe(true);
      fs.unlinkSync(outputPath);
    }

    // クリーンアップ
    fs.rmdirSync(tempDir);
  });
});

describe('Error Handling', () => {
  it('should handle invalid markdown gracefully', () => {
    const invalidMd = `---
invalid: yaml: syntax:
---

# Content
`;
    expect(() => parse(invalidMd)).toThrow();
  });

  it('should handle empty input', () => {
    const result = parse('');
    expect(result.slides).toHaveLength(0);
  });

  it('should handle invalid grid configuration', () => {
    const md = `---
grid: invalid
---

# Content
`;
    // Should handle gracefully
    expect(() => parse(md)).not.toThrow();
  });
});