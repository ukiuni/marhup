/**
 * Plugin Manager
 */

import * as fs from 'fs';
import * as path from 'path';
import { NodeVM } from 'vm2';
import type { Plugin, PluginManager as IPluginManager, PluginContext, ElementParser, ElementGenerator, PluginHooks } from '../types/plugin.js';
import logger from './logger.js';

class PluginManagerImpl implements IPluginManager {
  private plugins: Plugin[] = [];
  private elementParsers: Map<string, ElementParser> = new Map();
  private elementGenerators: Map<string, ElementGenerator> = new Map();

  async loadPlugins(pluginDir: string): Promise<void> {
    if (!fs.existsSync(pluginDir)) {
      logger.debug('Plugin directory does not exist', { pluginDir });
      return;
    }

    const files = fs.readdirSync(pluginDir).filter(file => file.endsWith('.js'));

    for (const file of files) {
      try {
        const pluginPath = path.join(pluginDir, file);
        const code = fs.readFileSync(pluginPath, 'utf8');
        const vm = new NodeVM({
          console: 'inherit',
          sandbox: {
            console,
            RegExp,
            String,
            Array,
            Object,
            Math,
            Date,
            JSON,
            Error,
            parseInt,
            parseFloat,
            isNaN,
            isFinite,
            encodeURIComponent,
            decodeURIComponent,
          },
          require: {
            external: false,
            builtin: [],
          },
        });
        const pluginModule = vm.run(code);
        const plugin: Plugin = pluginModule;

        if (this.validatePlugin(plugin)) {
          this.plugins.push(plugin);
          logger.info(`Loaded plugin: ${plugin.name}`);

          // Register parsers and generators
          if (plugin.elementParsers) {
            for (const [type, parser] of Object.entries(plugin.elementParsers)) {
              this.elementParsers.set(type, parser);
            }
          }
          if (plugin.elementGenerators) {
            for (const [type, generator] of Object.entries(plugin.elementGenerators)) {
              this.elementGenerators.set(type, generator);
            }
          }
        } else {
          logger.warn(`Invalid plugin: ${file}`);
        }
      } catch (error) {
        logger.error(`Failed to load plugin ${file}`, { error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  private validatePlugin(plugin: unknown): plugin is Plugin {
    return typeof plugin === 'object' && plugin !== null && typeof (plugin as Plugin).name === 'string';
  }

  getElementParser(type: string): ElementParser | undefined {
    return this.elementParsers.get(type);
  }

  getElementGenerator(type: string): ElementGenerator | undefined {
    return this.elementGenerators.get(type);
  }

  async executeHook<K extends keyof PluginHooks>(hook: K, ...args: Parameters<NonNullable<PluginHooks[K]>>): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.hooks && plugin.hooks[hook]) {
        try {
          await (plugin.hooks[hook] as any)(...args);
        } catch (error) {
          logger.error(`Plugin ${plugin.name} hook ${hook} failed`, { error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
  }

  async init(context: PluginContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.hooks?.onInit) {
        try {
          await plugin.hooks.onInit(context);
        } catch (error) {
          logger.error(`Plugin ${plugin.name} init failed`, { error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
  }
}

export const pluginManager = new PluginManagerImpl();
export { PluginManagerImpl as PluginManager };