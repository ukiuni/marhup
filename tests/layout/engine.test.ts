/**
 * レイアウトエンジンのテスト
 */

import { describe, it, expect } from 'vitest';
import { layoutSlide, gridToCoordinates } from '../../src/layout/engine.js';
import type { Slide, SlideFrontmatter } from '../../src/types/index.js';

describe('layoutSlide', () => {
  const globalFrontmatter: SlideFrontmatter = {};

  it('デフォルトグリッドでレイアウトできる', () => {
    const slide: Slide = {
      frontmatter: {},
      elements: [
        { type: 'heading', content: 'タイトル', level: 1 },
        { type: 'paragraph', content: 'テキスト' },
      ],
    };

    const result = layoutSlide(slide, globalFrontmatter);

    expect(result.elements).toHaveLength(2);
    expect(result.gridMap).toHaveLength(9); // デフォルト9行
    expect(result.gridMap[0]).toHaveLength(12); // デフォルト12列
  });

  it('スライド個別のグリッド設定を適用できる', () => {
    const slide: Slide = {
      frontmatter: { grid: '6x4' },
      elements: [{ type: 'heading', content: 'タイトル', level: 1 }],
    };

    const result = layoutSlide(slide, globalFrontmatter);

    expect(result.gridMap).toHaveLength(4);
    expect(result.gridMap[0]).toHaveLength(6);
  });

  it('グローバルグリッド設定を適用できる', () => {
    const slide: Slide = {
      frontmatter: {},
      elements: [{ type: 'heading', content: 'タイトル', level: 1 }],
    };
    const globalFm: SlideFrontmatter = { grid: '8x6' };

    const result = layoutSlide(slide, globalFm);

    expect(result.gridMap).toHaveLength(6);
    expect(result.gridMap[0]).toHaveLength(8);
  });

  it('グリッドマップが正しく作成される', () => {
    const slide: Slide = {
      frontmatter: {},
      elements: [
        {
          type: 'heading',
          content: 'タイトル',
          level: 1,
          position: { colStart: 1, colEnd: 6, rowStart: 1, rowEnd: 1 },
        },
      ],
    };

    const result = layoutSlide(slide, globalFrontmatter);

    // 位置1-6,1-1が占有されている
    for (let col = 0; col < 6; col++) {
      expect(result.gridMap[0][col].occupied).toBe(true);
      expect(result.gridMap[0][col].elementIndex).toBe(0);
    }
    // それ以外は未占有
    for (let col = 6; col < 12; col++) {
      expect(result.gridMap[0][col].occupied).toBe(false);
    }
  });
});

describe('gridToCoordinates', () => {
  const grid = { cols: 12, rows: 9 };
  const slideSize = { width: 10, height: 7.5 }; // 標準スライドサイズ

  it('グリッド位置を座標に変換できる', () => {
    const position = { colStart: 1, colEnd: 6, rowStart: 1, rowEnd: 3 };
    const coords = gridToCoordinates(position, grid, slideSize);

    // マージン0.5インチ
    const margin = 0.5;
    const contentWidth = slideSize.width - margin * 2; // 9
    const contentHeight = slideSize.height - margin * 2; // 6.5

    const cellWidth = contentWidth / grid.cols; // 9/12 = 0.75
    const cellHeight = contentHeight / grid.rows; // 6.5/9 ≈ 0.722

    expect(coords.x).toBeCloseTo(margin + 0 * cellWidth, 2); // 0.5
    expect(coords.y).toBeCloseTo(margin + 0 * cellHeight, 2); // 0.5
    expect(coords.w).toBeCloseTo(6 * cellWidth, 2); // 4.5
    expect(coords.h).toBeCloseTo(3 * cellHeight, 2); // ≈2.166
  });

  it('マージンをカスタム設定できる', () => {
    const position = { colStart: 1, colEnd: 1, rowStart: 1, rowEnd: 1 };
    const coords = gridToCoordinates(position, grid, slideSize, 1.0);

    expect(coords.x).toBe(1.0);
    expect(coords.y).toBe(1.0);
  });

  it('全グリッドをカバーする位置', () => {
    const position = { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 9 };
    const coords = gridToCoordinates(position, grid, slideSize);

    const margin = 0.5;
    expect(coords.x).toBe(margin);
    expect(coords.y).toBe(margin);
    expect(coords.w).toBe(slideSize.width - margin * 2);
    expect(coords.h).toBe(slideSize.height - margin * 2);
  });
});