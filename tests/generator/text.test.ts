/**
 * テキストジェネレーターのテスト
 */

import { describe, it, expect, vi } from 'vitest';
import { addHeadingElement, addTextElement } from '../src/generator/text.js';
import { addListElement } from '../src/generator/list.js';
import type { PlacedElement } from '../src/layout/index.js';
import type { ThemeConfig } from '../src/types/index.js';

// Mock PptxGenJS
const mockSlide = {
  addText: vi.fn(),
};

const mockTheme: ThemeConfig = {
  fontSize: {
    h1: 44,
    h2: 32,
    h3: 28,
    body: 18,
  },
  colors: {
    text: '#000000',
    background: '#ffffff',
    accent: '#0066cc',
  },
  fonts: {
    heading: 'Arial',
    body: 'Arial',
  },
};

describe('addHeadingElement', () => {
  it('should add heading with correct font size for level 1', () => {
    const element: PlacedElement = {
      type: 'heading',
      level: 1,
      content: 'Test Heading',
      position: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 2 },
    };
    const coords = { x: 0, y: 0, w: 100, h: 50 };

    addHeadingElement(mockSlide as any, element, coords, {}, mockTheme);

    expect(mockSlide.addText).toHaveBeenCalledWith('Test Heading', expect.objectContaining({
      fontSize: 44,
      bold: true,
    }));
  });

  it('should add heading with correct font size for level 2', () => {
    const element: PlacedElement = {
      type: 'heading',
      level: 2,
      content: 'Test Heading',
      position: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 2 },
    };
    const coords = { x: 0, y: 0, w: 100, h: 50 };

    addHeadingElement(mockSlide as any, element, coords, {}, mockTheme);

    expect(mockSlide.addText).toHaveBeenCalledWith('Test Heading', expect.objectContaining({
      fontSize: 32,
      bold: true,
    }));
  });

  it('should handle missing level', () => {
    const element: PlacedElement = {
      type: 'heading',
      content: 'Test Heading',
      position: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 2 },
    };
    const coords = { x: 0, y: 0, w: 100, h: 50 };

    addHeadingElement(mockSlide as any, element, coords, {}, mockTheme);

    expect(mockSlide.addText).toHaveBeenCalledWith('Test Heading', expect.objectContaining({
      fontSize: 44, // Default to level 1
      bold: true,
    }));
  });
});

describe('addTextElement', () => {
  it('should add text element with correct styling', () => {
    const element: PlacedElement = {
      type: 'text',
      content: 'Test text content',
      position: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 2 },
    };
    const coords = { x: 0, y: 0, w: 100, h: 50 };

    addTextElement(mockSlide as any, element, coords, {}, mockTheme);

    expect(mockSlide.addText).toHaveBeenCalledWith('Test text content', expect.objectContaining({
      fontSize: 18,
      color: '000000',
    }));
  });
});

describe('addListElement', () => {
  it('should add list element with bullet points', () => {
    const element: PlacedElement = {
      type: 'list',
      content: [
        { content: 'Item 1', level: 0 },
        { content: 'Item 2', level: 0 },
      ],
      position: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 2 },
    };
    const coords = { x: 0, y: 0, w: 100, h: 50 };

    addListElement(mockSlide as any, element, coords, {}, mockTheme);

    expect(mockSlide.addText).toHaveBeenCalledWith(
      expect.stringContaining('• Item 1\n• Item 2'),
      expect.any(Object)
    );
  });

  it('should handle nested list items', () => {
    const element: PlacedElement = {
      type: 'list',
      content: [
        { content: 'Item 1', level: 0 },
        { content: 'Subitem', level: 1 },
      ],
      position: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 2 },
    };
    const coords = { x: 0, y: 0, w: 100, h: 50 };

    addListElement(mockSlide as any, element, coords, {}, mockTheme);

    expect(mockSlide.addText).toHaveBeenCalledWith(
      expect.stringContaining('• Item 1\n  • Subitem'),
      expect.any(Object)
    );
  });
});