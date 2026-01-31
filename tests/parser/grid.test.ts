/**
 * グリッドパーサーのテスト
 */

import { describe, it, expect } from 'vitest';
import {
  extractGridPosition,
  extractStyle,
  extractGridAndStyle,
  parseBlockGridLine,
} from '../../src/parser/grid.js';

describe('extractGridPosition', () => {
  it('単一セルの位置を抽出できる', () => {
    const result = extractGridPosition('テキスト [3, 5]');
    expect(result.position).toEqual({
      colStart: 3,
      colEnd: 3,
      rowStart: 5,
      rowEnd: 5,
    });
    expect(result.cleanText).toBe('テキスト');
  });

  it('列範囲を抽出できる', () => {
    const result = extractGridPosition('テキスト [1-6, 2]');
    expect(result.position).toEqual({
      colStart: 1,
      colEnd: 6,
      rowStart: 2,
      rowEnd: 2,
    });
  });

  it('行範囲を抽出できる', () => {
    const result = extractGridPosition('テキスト [3, 2-5]');
    expect(result.position).toEqual({
      colStart: 3,
      colEnd: 3,
      rowStart: 2,
      rowEnd: 5,
    });
  });

  it('矩形範囲を抽出できる', () => {
    const result = extractGridPosition('テキスト [1-6, 2-8]');
    expect(result.position).toEqual({
      colStart: 1,
      colEnd: 6,
      rowStart: 2,
      rowEnd: 8,
    });
  });

  it('位置指定がない場合はundefinedを返す', () => {
    const result = extractGridPosition('テキストのみ');
    expect(result.position).toBeUndefined();
    expect(result.cleanText).toBe('テキストのみ');
  });
});

describe('extractStyle', () => {
  it('単一クラスを抽出できる', () => {
    const result = extractStyle('テキスト {.center}');
    expect(result.style?.classes).toEqual(['center']);
    expect(result.cleanText).toBe('テキスト');
  });

  it('複数クラスを抽出できる', () => {
    const result = extractStyle('テキスト {.center .blue .bold}');
    expect(result.style?.classes).toEqual(['center', 'blue', 'bold']);
  });

  it('プロパティを抽出できる', () => {
    const result = extractStyle('テキスト {bg=#f0f0f0}');
    expect(result.style?.properties).toEqual({ bg: '#f0f0f0' });
  });

  it('クラスとプロパティを両方抽出できる', () => {
    const result = extractStyle('テキスト {.center bg=#f0f0f0}');
    expect(result.style?.classes).toEqual(['center']);
    expect(result.style?.properties).toEqual({ bg: '#f0f0f0' });
  });

  it('スタイル指定がない場合はundefinedを返す', () => {
    const result = extractStyle('テキストのみ');
    expect(result.style).toBeUndefined();
  });
});

describe('extractGridAndStyle', () => {
  it('位置とスタイルを両方抽出できる', () => {
    const result = extractGridAndStyle('# タイトル [1-12, 1] {.center}');
    expect(result.position).toEqual({
      colStart: 1,
      colEnd: 12,
      rowStart: 1,
      rowEnd: 1,
    });
    expect(result.style?.classes).toEqual(['center']);
    expect(result.cleanText).toBe('# タイトル');
  });
});

describe('parseBlockGridLine', () => {
  it('グリッドブロック行を認識できる', () => {
    const result = parseBlockGridLine('[1-6, 2-8]');
    expect(result.isGridBlock).toBe(true);
    expect(result.position).toEqual({
      colStart: 1,
      colEnd: 6,
      rowStart: 2,
      rowEnd: 8,
    });
  });

  it('スタイル付きグリッドブロック行を認識できる', () => {
    const result = parseBlockGridLine('[1-6, 2-8] {.card}');
    expect(result.isGridBlock).toBe(true);
    expect(result.style?.classes).toEqual(['card']);
  });

  it('通常のテキストはグリッドブロックではない', () => {
    const result = parseBlockGridLine('普通のテキスト');
    expect(result.isGridBlock).toBe(false);
  });
});
