/**
 * MCPハンドラーのテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getToolDefinitions,
  getMd2pptGuide,
  handleToolCall,
} from '../../src/mcp-handlers.js';

describe('MCP Tools', () => {
  describe('getToolDefinitions', () => {
    it('3つのツールを返す', () => {
      const tools = getToolDefinitions();
      expect(tools).toHaveLength(3);
    });

    it('convert_markdown_to_pptxツールが定義されている', () => {
      const tools = getToolDefinitions();
      const tool = tools.find((t) => t.name === 'convert_markdown_to_pptx');

      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('markdown');
      expect(tool?.inputSchema.required).toContain('outputPath');
    });

    it('convert_file_to_pptxツールが定義されている', () => {
      const tools = getToolDefinitions();
      const tool = tools.find((t) => t.name === 'convert_file_to_pptx');

      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('inputPath');
      expect(tool?.inputSchema.required).toContain('outputPath');
    });

    it('get_md2ppt_guideツールが定義されている', () => {
      const tools = getToolDefinitions();
      const tool = tools.find((t) => t.name === 'get_md2ppt_guide');

      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toHaveLength(0);
    });
  });

  describe('getMd2pptGuide', () => {
    it('ガイド文字列を返す', () => {
      const guide = getMd2pptGuide();

      expect(guide).toContain('md2ppt Markdown記法ガイド');
      expect(guide).toContain('グリッド座標系');
      expect(guide).toContain('[1-12, 1]');
    });
  });

  describe('handleToolCall', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2ppt-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('get_md2ppt_guide', () => {
      it('ガイドを返す', async () => {
        const result = await handleToolCall('get_md2ppt_guide', {});

        expect(result.isError).toBeUndefined();
        expect(result.content).toHaveLength(1);
        expect(result.content[0].text).toContain('md2ppt Markdown記法ガイド');
      });
    });

    describe('convert_markdown_to_pptx', () => {
      it('Markdownを変換してPPTXを生成する', async () => {
        const outputPath = path.join(tempDir, 'output.pptx');
        const markdown = `# テストスライド

テスト内容`;

        const result = await handleToolCall('convert_markdown_to_pptx', {
          markdown,
          outputPath,
        });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('PowerPointファイルを生成しました');
        expect(fs.existsSync(outputPath)).toBe(true);
      });

      it('markdownが未指定の場合エラーを返す', async () => {
        const outputPath = path.join(tempDir, 'output.pptx');

        const result = await handleToolCall('convert_markdown_to_pptx', {
          outputPath,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('必須パラメータ');
      });

      it('outputPathが未指定の場合エラーを返す', async () => {
        const result = await handleToolCall('convert_markdown_to_pptx', {
          markdown: '# Test',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('必須パラメータ');
      });

      it('存在しない出力ディレクトリを自動作成する', async () => {
        const outputPath = path.join(tempDir, 'subdir', 'nested', 'output.pptx');
        const markdown = '# テスト';

        const result = await handleToolCall('convert_markdown_to_pptx', {
          markdown,
          outputPath,
        });

        expect(result.isError).toBeUndefined();
        expect(fs.existsSync(outputPath)).toBe(true);
      });
    });

    describe('convert_file_to_pptx', () => {
      it('MarkdownファイルからPPTXを生成する', async () => {
        const inputPath = path.join(tempDir, 'input.md');
        const outputPath = path.join(tempDir, 'output.pptx');

        fs.writeFileSync(inputPath, '# ファイルテスト\n\n内容');

        const result = await handleToolCall('convert_file_to_pptx', {
          inputPath,
          outputPath,
        });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('PowerPointファイルを生成しました');
        expect(result.content[0].text).toContain(inputPath);
        expect(fs.existsSync(outputPath)).toBe(true);
      });

      it('入力ファイルが存在しない場合エラーを返す', async () => {
        const inputPath = path.join(tempDir, 'nonexistent.md');
        const outputPath = path.join(tempDir, 'output.pptx');

        const result = await handleToolCall('convert_file_to_pptx', {
          inputPath,
          outputPath,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('入力ファイルが見つかりません');
      });

      it('inputPathが未指定の場合エラーを返す', async () => {
        const outputPath = path.join(tempDir, 'output.pptx');

        const result = await handleToolCall('convert_file_to_pptx', {
          outputPath,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('必須パラメータ');
      });
    });

    describe('unknown tool', () => {
      it('未知のツールでエラーを返す', async () => {
        const result = await handleToolCall('unknown_tool', {});

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Unknown tool');
      });
    });
  });
});
