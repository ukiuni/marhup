import { vi } from 'vitest';
import * as fs from 'fs';

// Mock fs and path for testing
vi.mock('fs');
vi.mock('path');

vi.mock('vm2', () => ({
  NodeVM: class MockNodeVM {
    run = vi.fn().mockReturnValue({
      name: 'test-plugin',
      elementParsers: {
        custom: (content: string) => ({ type: 'custom', content })
      }
    })
  }
}));

import { describe, it, expect } from 'vitest';
import { PluginManager } from '../src/utils/plugin-manager.js';

const mockFs = fs as any;

describe('PluginManager', () => {
  let pluginManager: any;

  beforeEach(() => {
    pluginManager = new PluginManager();
    vi.clearAllMocks();
  });

  it('should load plugins from directory', async () => {
    const pluginDir = '/plugins';
    const pluginFile = 'test-plugin.js';
    const pluginCode = `
      module.exports = {
        name: 'test-plugin',
        elementParsers: {
          custom: (content) => ({ type: 'custom', content })
        }
      };
    `;

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue([pluginFile]);
    mockFs.readFileSync.mockReturnValue(pluginCode);

    await pluginManager.loadPlugins(pluginDir);

    // Verify plugin was loaded
    const parser = pluginManager.getElementParser('custom');
    expect(parser).toBeDefined();
  });

  it('should handle non-existent plugin directory', async () => {
    const pluginDir = '/nonexistent';

    mockFs.existsSync.mockReturnValue(false);

    await expect(pluginManager.loadPlugins(pluginDir)).resolves.not.toThrow();
  });

  it('should validate plugin structure', async () => {
    const pluginDir = '/plugins';
    const invalidPluginFile = 'invalid-plugin.js';
    const invalidPluginCode = `
      module.exports = {
        invalid: 'plugin'
      };
    `;

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue([invalidPluginFile]);
    mockFs.readFileSync.mockReturnValue(invalidPluginCode);

    await pluginManager.loadPlugins(pluginDir);

    // Invalid plugin should not be loaded
    expect(pluginManager.getElementParser('any')).toBeUndefined();
  });

  it('should handle plugin loading errors', async () => {
    const pluginDir = '/plugins';
    const errorPluginFile = 'error-plugin.js';

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue([errorPluginFile]);
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('Read error');
    });

    await expect(pluginManager.loadPlugins(pluginDir)).resolves.not.toThrow();
  });

  it('should return undefined for non-existent parser', () => {
    const parser = pluginManager.getElementParser('nonexistent');
    expect(parser).toBeUndefined();
  });

  it('should return undefined for non-existent generator', () => {
    const generator = pluginManager.getElementGenerator('nonexistent');
    expect(generator).toBeUndefined();
  });
});