/**
 * PPTXジェネレーターのテスト
 */

import { vi } from 'vitest';

// Mock PptxGenJS
vi.mock('pptxgenjs', () => {
  class MockPptxGenJS {
    title = vi.fn();
    author = vi.fn();
    defineLayout = vi.fn();
    defineSlideMaster = vi.fn();
    addSlide = vi.fn().mockReturnValue({
      addText: vi.fn(),
      addImage: vi.fn(),
      addTable: vi.fn(),
      setTransition: vi.fn(),
    });
    writeFile = vi.fn().mockResolvedValue(undefined);
  }
  return { default: MockPptxGenJS };
});

import { describe, it, expect } from 'vitest';
import { generatePptx } from '../src/generator/pptx.js';
import { GenerationError } from '../src/errors.js';
import type { ParsedDocument } from '../src/types/index.js';
import PptxGenJS from 'pptxgenjs';

describe('generatePptx', () => {
  it('should generate PPTX for valid document', async () => {
    const doc: ParsedDocument = {
      globalFrontmatter: { title: 'Test' },
      slides: [
        {
          frontmatter: {},
          elements: [
            {
              type: 'heading',
              level: 1,
              content: 'Test Slide',
              position: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 2 },
            },
          ],
        },
      ],
    };

    const tempDir = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'marhup-test-'));
    const outputPath = require('path').join(tempDir, 'test.pptx');

    try {
      await generatePptx(doc, outputPath);
      // Success
    } finally {
      require('fs').rmdirSync(tempDir);
    }
  });

  it('should throw error for invalid element type', async () => {
    const doc: ParsedDocument = {
      globalFrontmatter: { theme: 'default' },
      slides: [
        {
          frontmatter: {},
          elements: [
            {
              type: 'invalid' as any,
              content: 'Test',
              position: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 2 },
            },
          ],
        },
      ],
    };

    const tempDir = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'marhup-test-'));
    const outputPath = require('path').join(tempDir, 'test.pptx');

    try {
      await expect(generatePptx(doc, outputPath)).rejects.toThrow(GenerationError);
    } finally {
      require('fs').rmdirSync(tempDir);
    }
  });

  it('should handle empty document', async () => {
    const doc: ParsedDocument = {
      globalFrontmatter: { theme: 'default' },
      slides: [],
    };

    const tempDir = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'marhup-test-'));
    const outputPath = require('path').join(tempDir, 'test.pptx');

    try {
      await generatePptx(doc, outputPath);
      // Success
    } finally {
      require('fs').rmdirSync(tempDir);
    }
  });
});