/**
 * i18nユーティリティのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initI18n, t, changeLanguage, getCurrentLanguage } from '../src/utils/i18n.js';

describe('i18n', () => {
  beforeEach(async () => {
    // Initialize with default language
    await initI18n('en');
  });

  it('should initialize with English', async () => {
    await initI18n('en');
    expect(getCurrentLanguage()).toBe('en');
  });

  it('should initialize with Japanese', async () => {
    await initI18n('ja');
    expect(getCurrentLanguage()).toBe('ja');
  });

  it('should translate keys in English', async () => {
    await initI18n('en');
    // Test a known key
    const translation = t('cli.messages.configLoadFailed', { configPath: 'test.json' });
    expect(typeof translation).toBe('string');
    expect(translation.length).toBeGreaterThan(0);
  });

  it('should translate keys in Japanese', async () => {
    await initI18n('ja');
    const translation = t('cli.messages.configLoadFailed', { configPath: 'test.json' });
    expect(typeof translation).toBe('string');
    expect(translation.length).toBeGreaterThan(0);
  });

  it('should change language dynamically', async () => {
    await initI18n('en');
    expect(getCurrentLanguage()).toBe('en');

    await changeLanguage('ja');
    expect(getCurrentLanguage()).toBe('ja');
  });

  it('should handle missing keys gracefully', async () => {
    await initI18n('en');
    const translation = t('nonexistent.key', {});
    expect(translation).toBe('nonexistent.key'); // Fallback to key
  });
});