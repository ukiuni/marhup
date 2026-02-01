/**
 * Plugin type definitions
 */

import type { SlideElement, ParsedDocument, ConvertOptions, PlacedElement, GridConfig, Slide, ThemeConfig } from './index.js';
import type { ISlide, IPresentation } from '../generator/presentation.js';
import type { Logger } from 'winston';
import type { Token } from 'marked';

export interface PluginContext {
  logger: Logger;
  options: ConvertOptions;
}

export interface ElementParser {
  (token: Token, aliases?: Record<string, string>, gridConfig?: GridConfig): SlideElement | null;
}

export interface ElementGeneratorContext {
  grid: GridConfig;
  slideData: Slide;
  theme: ThemeConfig;
  basePath?: string;
  coords: { x: number; y: number; w: number; h: number };
  styleProps: Record<string, unknown>;
}

export interface ElementGenerator {
  (element: PlacedElement, slide: ISlide, context: ElementGeneratorContext): Promise<string[]>;
}

export interface PluginHooks {
  onInit?: (context: PluginContext) => void;
  onParse?: (document: ParsedDocument) => ParsedDocument;
  onGenerate?: (presentation: IPresentation) => void;
}

export interface Plugin {
  name: string;
  version?: string;
  description?: string;
  elementParsers?: Record<string, ElementParser>;
  elementGenerators?: Record<string, ElementGenerator>;
  hooks?: PluginHooks;
}

export interface PluginManager {
  loadPlugins(pluginDir: string): Promise<void>;
  getElementParser(type: string): ElementParser | undefined;
  getElementGenerator(type: string): ElementGenerator | undefined;
  executeHook<K extends keyof PluginHooks>(hook: K, ...args: Parameters<NonNullable<PluginHooks[K]>>): Promise<void>;
}