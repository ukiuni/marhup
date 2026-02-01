/**
 * CLIのテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { marhupFile } from '../src/index.js';

// CLIのテストは複雑なので、基本的なエラーハンドリングをテスト

describe('CLI Error Handling', () => {
  let originalArgv: string[];
  let originalExit: (code?: number) => never;
  let originalConsoleError: typeof console.error;
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExit = process.exit;
    originalConsoleError = console.error;
    originalConsoleLog = console.log;

    // Mock process.exit
    process.exit = vi.fn<(code?: number) => never>();
    console.error = vi.fn();
    console.log = vi.fn();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  it('should handle invalid input file', async () => {
    // This would require mocking the CLI execution
    // For now, test the underlying function
    const invalidPath = '/nonexistent/file.md';

    await expect(marhupFile(invalidPath, { output: '/tmp/test.pptx' })).rejects.toThrow();
  });

  it('should handle invalid output path', async () => {
    const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'marhup-test-'));
    const inputPath = path.join(tempDir, 'input.md');
    fs.writeFileSync(inputPath, '# Test\n');

    const invalidOutput = '/invalid/path/test.pptx';

    await expect(marhupFile(inputPath, { output: invalidOutput })).rejects.toThrow();

    // Cleanup
    fs.unlinkSync(inputPath);
    fs.rmdirSync(tempDir);
  });
});