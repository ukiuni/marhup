/**
 * レイアウトエンジンのテスト
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  autoPlaceElements,
  estimateElementHeight,
  findAvailablePosition,
  validateGridPosition,
  isAreaAvailable,
  createEmptyGridMap,
} from '../../src/layout/auto.js';
import type { SlideElement, GridConfig } from '../../src/types/index.js';
import { initI18n } from '../../src/utils/i18n.js';

const DEFAULT_GRID: GridConfig = { cols: 12, rows: 9 };

beforeAll(async () => {
  await initI18n('en');
});

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

  it('重複する明示的位置指定は許容され、描画順序が決定論的', () => {
    const elements: SlideElement[] = [
      {
        type: 'heading',
        content: '大きい要素',
        level: 1,
        position: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 5 }, // 大きい
      },
      {
        type: 'paragraph',
        content: '小さい要素',
        position: { colStart: 1, colEnd: 6, rowStart: 1, rowEnd: 3 }, // 小さい、重複
      },
    ];

    const result = autoPlaceElements(elements, DEFAULT_GRID);

    // 小さい要素が先に描画される（面積でソート）
    expect(result[0].content).toBe('小さい要素');
    expect(result[1].content).toBe('大きい要素');
  });
});

describe('validateGridPosition', () => {
  it('有効な位置はエラーを投げない', () => {
    const position = { colStart: 1, colEnd: 6, rowStart: 2, rowEnd: 5 };
    expect(() => validateGridPosition(position, DEFAULT_GRID)).not.toThrow();
  });

  it('列開始が範囲外の場合エラー', () => {
    const position = { colStart: 0, colEnd: 6, rowStart: 2, rowEnd: 5 };
    expect(() => validateGridPosition(position, DEFAULT_GRID)).toThrow(
      'Grid error at position [0-6, 2-5]: Column start 0 is out of range (1-12)'
    );
  });

  it('列終了が範囲外の場合エラー', () => {
    const position = { colStart: 1, colEnd: 13, rowStart: 2, rowEnd: 5 };
    expect(() => validateGridPosition(position, DEFAULT_GRID)).toThrow(
      'Grid error at position [1-13, 2-5]: Column end 13 is out of range (1-12)'
    );
  });

  it('行開始が範囲外の場合エラー', () => {
    const position = { colStart: 1, colEnd: 6, rowStart: 0, rowEnd: 5 };
    expect(() => validateGridPosition(position, DEFAULT_GRID)).toThrow(
      'Grid error at position [1-6, 0-5]: Row start 0 is out of range (1-9)'
    );
  });

  it('行終了が範囲外の場合エラー', () => {
    const position = { colStart: 1, colEnd: 6, rowStart: 2, rowEnd: 10 };
    expect(() => validateGridPosition(position, DEFAULT_GRID)).toThrow(
      'Grid error at position [1-6, 2-10]: Row end 10 is out of range (1-9)'
    );
  });

  it('列開始 > 列終了の場合エラー', () => {
    const position = { colStart: 6, colEnd: 1, rowStart: 2, rowEnd: 5 };
    expect(() => validateGridPosition(position, DEFAULT_GRID)).toThrow(
      'Grid error at position [6-1, 2-5]: Column start 6 cannot be greater than column end 1'
    );
  });

  it('行開始 > 行終了の場合エラー', () => {
    const position = { colStart: 1, colEnd: 6, rowStart: 5, rowEnd: 2 };
    expect(() => validateGridPosition(position, DEFAULT_GRID)).toThrow(
      'Grid error at position [1-6, 5-2]: Row start 5 cannot be greater than row end 2'
    );
  });
});

describe('isAreaAvailable', () => {
  it('空の領域は利用可能', () => {
    const gridMap = createEmptyGridMap(12, 9);
    const position = { colStart: 1, colEnd: 6, rowStart: 1, rowEnd: 3 };
    expect(isAreaAvailable(gridMap, position)).toBe(true);
  });

  it('占有された領域は利用不可', () => {
    const gridMap = createEmptyGridMap(12, 9);
    gridMap[0][0].occupied = true; // 1,1
    const position = { colStart: 1, colEnd: 1, rowStart: 1, rowEnd: 1 };
    expect(isAreaAvailable(gridMap, position)).toBe(false);
  });

  it('部分的に占有された領域は利用不可', () => {
    const gridMap = createEmptyGridMap(12, 9);
    gridMap[1][2].occupied = true; // 3,2
    const position = { colStart: 1, colEnd: 6, rowStart: 1, rowEnd: 3 };
    expect(isAreaAvailable(gridMap, position)).toBe(false);
  });

  it('グリッド外の位置は利用不可', () => {
    const gridMap = createEmptyGridMap(12, 9);
    const position = { colStart: 10, colEnd: 15, rowStart: 1, rowEnd: 3 };
    expect(isAreaAvailable(gridMap, position)).toBe(false);
  });
});

describe('findAvailablePosition', () => {
  it('空のグリッドで位置が見つかる', () => {
    const gridMap = createEmptyGridMap(12, 9);
    const position = findAvailablePosition(gridMap, 1, 2, DEFAULT_GRID);
    expect(position).toEqual({
      colStart: 1,
      colEnd: 12,
      rowStart: 1,
      rowEnd: 2,
    });
  });

  it('開始行から下を探索', () => {
    const gridMap = createEmptyGridMap(12, 9);
    // 最初の2行を占有
    for (let col = 0; col < 12; col++) {
      gridMap[0][col].occupied = true;
      gridMap[1][col].occupied = true;
    }
    const position = findAvailablePosition(gridMap, 1, 2, DEFAULT_GRID);
    expect(position).toEqual({
      colStart: 1,
      colEnd: 12,
      rowStart: 3,
      rowEnd: 4,
    });
  });

  it('利用可能な位置がない場合はnull', () => {
    const gridMap = createEmptyGridMap(12, 9);
    // 全てを占有
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 12; col++) {
        gridMap[row][col].occupied = true;
      }
    }
    const position = findAvailablePosition(gridMap, 1, 1, DEFAULT_GRID);
    expect(position).toBeNull();
  });

  it('高さがグリッドを超える場合はnull', () => {
    const gridMap = createEmptyGridMap(12, 9);
    const position = findAvailablePosition(gridMap, 8, 3, DEFAULT_GRID);
    expect(position).toBeNull();
  });
});
