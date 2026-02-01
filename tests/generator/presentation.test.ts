import { vi } from 'vitest';

// Mock PptxGenJS
vi.mock('pptxgenjs', () => {
  class MockPptxGenJS {
    title = vi.fn();
    author = vi.fn();
    defineLayout = vi.fn();
    addSlide = vi.fn().mockReturnValue({
      addText: vi.fn(),
      addImage: vi.fn(),
      addTable: vi.fn(),
    });
    writeFile = vi.fn().mockResolvedValue(undefined);
  }
  return { default: MockPptxGenJS };
});

import { describe, it, expect } from 'vitest';
import { createPresentation, createSlide } from '../src/generator/presentation.js';

describe('createPresentation', () => {
  it('should create presentation with default options', () => {
    const pres = createPresentation();
    expect(pres).toBeDefined();
  });

  it('should create presentation with custom options', () => {
    const options = {
      title: 'Test Presentation',
      author: 'Test Author',
    };
    const pres = createPresentation(options);
    expect(pres).toBeDefined();
  });
});

describe('createSlide', () => {
  it('should create slide with default options', () => {
    const pres = createPresentation();
    const slide = createSlide(pres);
    expect(slide).toBeDefined();
  });

  it('should create slide with custom options', () => {
    const pres = createPresentation();
    const options = {
      master: 'MASTER_SLIDE',
      transition: {
        type: 'fade',
        duration: 500,
      },
    };
    const slide = createSlide(pres, options);
    expect(slide).toBeDefined();
  });
});