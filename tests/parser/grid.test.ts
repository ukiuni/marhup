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
import { GridError } from '../../src/errors.js';

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

  it('別名を解決できる', () => {
    const aliases = { title: '[1-12, 1]' };
    const result = extractGridPosition('テキスト [title]', aliases);
    expect(result.position).toEqual({
      colStart: 1,
      colEnd: 12,
      rowStart: 1,
      rowEnd: 1,
    });
    expect(result.cleanText).toBe('テキスト');
  });

  it('位置指定がない場合はundefinedを返す', () => {
    const result = extractGridPosition('テキストのみ');
    expect(result.position).toBeUndefined();
    expect(result.cleanText).toBe('テキストのみ');
  });

  it('不正なグリッド記法は無視される', () => {
    const result = extractGridPosition('テキスト [1-6, 2-8 無効]');
    expect(result.position).toBeUndefined();
    expect(result.cleanText).toBe('テキスト [1-6, 2-8 無効]');
  });

  it('存在しない別名は無視される', () => {
    const aliases = { title: '[1-12, 1]' };
    const result = extractGridPosition('テキスト [nonexistent]', aliases);
    expect(result.position).toBeUndefined();
    expect(result.cleanText).toBe('テキスト [nonexistent]');
  });

  it('別名の再帰的解決', () => {
    const aliases = { title: '[header]', header: '[1-12, 1]' };
    const result = extractGridPosition('テキスト [title]', aliases);
    expect(result.position).toEqual({
      colStart: 1,
      colEnd: 12,
      rowStart: 1,
      rowEnd: 1,
    });
    expect(result.cleanText).toBe('テキスト');
  });

  it('境界外の列はエラーを投げる', () => {
    expect(() => extractGridPosition('テキスト [13, 5]')).toThrow(GridError);
  });

  it('境界外の行はエラーを投げる', () => {
    expect(() => extractGridPosition('テキスト [3, 10]')).toThrow(GridError);
  });

  it('0始まりの列はエラーを投げる', () => {
    expect(() => extractGridPosition('テキスト [0-12, 1-9]')).toThrow(GridError);
  });

  it('逆順の範囲はエラーを投げる', () => {
    expect(() => extractGridPosition('テキスト [6-1, 2]')).toThrow(GridError);
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

  it('コロン区切りのプロパティを抽出できる', () => {
    const result = extractStyle('テキスト {bg:#f0f0f0 color:red}');
    expect(result.style?.properties).toEqual({ bg: '#f0f0f0', color: 'red' });
  });

  it('アニメーションを抽出できる', () => {
    const result = extractStyle('テキスト {animation=fadein}');
    expect(result.style?.animation).toEqual({ type: 'fadein' });
    expect(result.cleanText).toBe('テキスト');
  });

  it('アニメーションとプロパティを抽出できる', () => {
    const result = extractStyle('テキスト {animation=flyin duration=1}');
    expect(result.style?.animation).toEqual({ type: 'flyin', duration: 1000 });
    expect(result.cleanText).toBe('テキスト');
  });

  it('不正なスタイル記法は空のスタイルを返す', () => {
    const result = extractStyle('テキスト {無効なスタイル}');
    expect(result.style?.classes).toEqual([]);
    expect(result.style?.properties).toEqual({});
    expect(result.cleanText).toBe('テキスト');
  });
});

describe('extractGridAndStyle', () => {
  it('位置とスタイルとアニメーションを両方抽出できる', () => {
    const result = extractGridAndStyle('# タイトル [1-12, 1] {.center animation=fadein}');
    expect(result.position).toEqual({
      colStart: 1,
      colEnd: 12,
      rowStart: 1,
      rowEnd: 1,
    });
    expect(result.style?.classes).toEqual(['center']);
    expect(result.animation).toEqual({ type: 'fadein' });
    expect(result.cleanText).toBe('# タイトル');
  });

  it('アニメーションのみを抽出できる', () => {
    const result = extractGridAndStyle('テキスト {animation=flyin}');
    expect(result.position).toBeUndefined();
    expect(result.style).toBeUndefined();
    expect(result.animation).toEqual({ type: 'flyin' });
    expect(result.cleanText).toBe('テキスト');
  });

  it('アニメーションとプロパティを抽出できる', () => {
    const result = extractGridAndStyle('テキスト {animation=zoom duration=1 delay=0.5}');
    expect(result.animation).toEqual({ type: 'zoom', duration: 1000, delay: 500 });
    expect(result.cleanText).toBe('テキスト');
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

  it('別名でグリッドブロックを認識できる', () => {
    const aliases = { title: '[1-12, 1]' };
    const result = parseBlockGridLine('[title]', aliases);
    expect(result.isGridBlock).toBe(true);
    expect(result.position).toEqual({
      colStart: 1,
      colEnd: 12,
      rowStart: 1,
      rowEnd: 1,
    });
  });

  it('通常のテキストはグリッドブロックではない', () => {
    const result = parseBlockGridLine('普通のテキスト');
    expect(result.isGridBlock).toBe(false);
  });

  it('不正なグリッドブロックは認識されない', () => {
    const result = parseBlockGridLine('[1-6, 2-8 無効]');
    expect(result.isGridBlock).toBe(false);
  });

  it('別名が存在しない場合はグリッドブロックではない', () => {
    const aliases = { title: '[1-12, 1]' };
    const result = parseBlockGridLine('[nonexistent]', aliases);
    expect(result.isGridBlock).toBe(false);
  });
});
