/**
 * デフォルトテーマのテスト
 */

import { describe, it, expect } from 'vitest';
import { resolveStyleClasses, styleClasses, defaultTheme } from '../../src/theme/default';
import { resolveTheme } from '../../src/theme/index';

describe('resolveStyleClasses', () => {
  it('should resolve predefined classes', () => {
    const result = resolveStyleClasses(['center', 'blue']);
    expect(result).toEqual({
      align: 'center',
      valign: 'middle',
      color: '#2563eb',
    });
  });

  it('should resolve custom classes', () => {
    const customClasses = {
      myclass: { color: '#ff0000', bold: true },
    };
    const result = resolveStyleClasses(['myclass'], customClasses);
    expect(result).toEqual({
      color: '#ff0000',
      bold: true,
    });
  });

  it('should prioritize custom classes over predefined', () => {
    const customClasses = {
      blue: { color: '#00ff00' }, // predefined blue is #2563eb
    };
    const result = resolveStyleClasses(['blue'], customClasses);
    expect(result).toEqual({
      color: '#00ff00',
    });
  });

  it('should combine multiple classes', () => {
    const customClasses = {
      myclass: { color: '#ff0000' },
    };
    const result = resolveStyleClasses(['center', 'myclass'], customClasses);
    expect(result).toEqual({
      align: 'center',
      valign: 'middle',
      color: '#ff0000',
    });
  });

  it('should ignore unknown classes', () => {
    const result = resolveStyleClasses(['unknown']);
    expect(result).toEqual({});
  });
});

describe('resolveTheme', () => {
  it('should return default theme when no theme is provided', () => {
    const result = resolveTheme(undefined);
    expect(result).toEqual(defaultTheme);
  });

  it('should return default theme for string "default"', () => {
    const result = resolveTheme('default');
    expect(result).toEqual(defaultTheme);
  });

  it('should merge partial theme with default', () => {
    const customTheme = {
      fonts: {
        title: 'Custom Font',
        body: 'Another Font',
      },
    };
    const result = resolveTheme(customTheme);
    expect(result.name).toBe('default');
    expect(result.fonts.title).toBe('Custom Font');
    expect(result.fonts.body).toBe('Another Font');
    expect(result.fonts.code).toBe(defaultTheme.fonts.code); // unchanged
    expect(result.colors).toEqual(defaultTheme.colors); // unchanged
  });

  it('should override colors partially', () => {
    const customTheme = {
      colors: {
        primary: '#ff0000',
      },
    };
    const result = resolveTheme(customTheme);
    expect(result.colors.primary).toBe('#ff0000');
    expect(result.colors.secondary).toBe(defaultTheme.colors.secondary); // unchanged
  });

  it('should merge advanced theme options with default', () => {
    const customTheme = {
      gradients: {
        background: {
          type: 'radial' as const,
          colors: ['#000000', '#ffffff'],
        },
      },
      slideMaster: {
        backgroundColor: '#f0f0f0',
        margin: {
          top: 1,
          bottom: 1,
          left: 1,
          right: 1,
        },
      },
      textStyles: {
        shadow: {
          type: 'inner' as const,
          color: '#cccccc',
          blur: 3,
          offset: { x: 2, y: 2 },
        },
      },
    };
    const result = resolveTheme(customTheme);
    expect(result.gradients?.background?.type).toBe('radial');
    expect(result.gradients?.background?.colors).toEqual(['#000000', '#ffffff']);
    expect(result.slideMaster?.backgroundColor).toBe('#f0f0f0');
    expect(result.slideMaster?.margin?.top).toBe(1);
    expect(result.textStyles?.shadow?.type).toBe('inner');
    expect(result.textStyles?.shadow?.color).toBe('#cccccc');
  });

  it('should allow additional custom colors and fonts', () => {
    const customTheme = {
      colors: {
        customColor: '#abcdef',
      },
      fonts: {
        customFont: 'CustomFont',
      },
      fontSize: {
        customSize: 42,
      },
    };
    const result = resolveTheme(customTheme);
    expect(result.colors.customColor).toBe('#abcdef');
    expect(result.fonts.customFont).toBe('CustomFont');
    expect(result.fontSize.customSize).toBe(42);
  });

  // TODO: Add tests for YAML file loading when mocking is fixed
});