/**
 * デフォルトテーマのテスト
 */

import { describe, it, expect } from 'vitest';
import { resolveStyleClasses, styleClasses } from '../../src/theme/default';

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