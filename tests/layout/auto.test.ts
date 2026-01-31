/**
 * レイアウトエンジンのテスト
 */

import { describe, it, expect } from 'vitest';
import {
  autoPlaceElements,
  estimateElementHeight,
  findAvailablePosition,
} from '../../src/layout/auto.js';
import type { SlideElement, GridConfig } from '../../src/types/index.js';

const DEFAULT_GRID: GridConfig = { cols: 12, rows: 9 };

describe('estimateElementHeight', () => {
  it('見出しは1行', () => {
    const element: SlideElement = { type: 'heading', content: 'タイトル', level: 1 };
    expect(estimateElementHeight(element)).toBe(1);
  });

  it('段落は2行', () => {
    const element: SlideElement = { type: 'paragraph', content: 'テキスト' };
    expect(estimateElementHeight(element)).toBe(2);
  });

  it('リストはアイテム数に応じた高さ', () => {
    const element: SlideElement = {
      type: 'list',
      content: [
        { content: '1', level: 0, ordered: false },
        { content: '2', level: 0, ordered: false },
        { content: '3', level: 0, ordered: false },
        { content: '4', level: 0, ordered: false },
      ],
    };
    expect(estimateElementHeight(element)).toBe(3);
  });
});

describe('autoPlaceElements', () => {
  it('明示的位置指定がある要素はその位置に配置', () => {
    const elements: SlideElement[] = [
      {
        type: 'heading',
        content: 'タイトル',
        level: 1,
        position: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 1 },
      },
    ];

    const result = autoPlaceElements(elements, DEFAULT_GRID);
    expect(result[0].position).toEqual({
      colStart: 1,
      colEnd: 12,
      rowStart: 1,
      rowEnd: 1,
    });
  });

  it('位置未指定の要素は自動配置', () => {
    const elements: SlideElement[] = [
      { type: 'heading', content: 'タイトル', level: 1 },
      { type: 'paragraph', content: 'テキスト' },
    ];

    const result = autoPlaceElements(elements, DEFAULT_GRID);

    // 見出しは全幅、1行目から
    expect(result[0].position.colStart).toBe(1);
    expect(result[0].position.colEnd).toBe(12);

    // 段落は見出しの後
    expect(result[1].position.rowStart).toBeGreaterThan(result[0].position.rowEnd);
  });

  it('明示的配置と自動配置が混在できる', () => {
    const elements: SlideElement[] = [
      {
        type: 'heading',
        content: 'タイトル',
        level: 1,
        position: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 1 },
      },
      { type: 'paragraph', content: '自動配置テキスト' },
      {
        type: 'paragraph',
        content: '右下に配置',
        position: { colStart: 7, colEnd: 12, rowStart: 7, rowEnd: 9 },
      },
    ];

    const result = autoPlaceElements(elements, DEFAULT_GRID);

    // 明示的配置の要素は指定位置
    expect(result[0].position).toEqual({
      colStart: 1,
      colEnd: 12,
      rowStart: 1,
      rowEnd: 1,
    });

    // 自動配置は衝突を避けて配置
    const autoPlaced = result.find((e) => e.content === '自動配置テキスト');
    expect(autoPlaced?.position.rowStart).toBeGreaterThan(1);
  });
});
