/**
 * Path validation utilitiesのテスト
 */

import { describe, it, expect } from 'vitest';
import { isPathWithinDirectory, validateAndResolvePath } from '../src/utils/path-validation.js';
import * as path from 'path';

describe('isPathWithinDirectory', () => {
  it('should return true for path within directory', () => {
    const allowedDir = '/home/user';
    const testPath = '/home/user/file.txt';
    expect(isPathWithinDirectory(testPath, allowedDir)).toBe(true);
  });

  it('should return true for path equal to directory', () => {
    const allowedDir = '/home/user';
    const testPath = '/home/user';
    expect(isPathWithinDirectory(testPath, allowedDir)).toBe(true);
  });

  it('should return false for path outside directory', () => {
    const allowedDir = '/home/user';
    const testPath = '/home/other/file.txt';
    expect(isPathWithinDirectory(testPath, allowedDir)).toBe(false);
  });

  it('should return false for path traversal attempt', () => {
    const allowedDir = '/home/user';
    const testPath = '/home/user/../../../etc/passwd';
    expect(isPathWithinDirectory(testPath, allowedDir)).toBe(false);
  });

  it('should handle normalized paths', () => {
    const allowedDir = '/home/user';
    const testPath = '/home/user/./subdir/../file.txt';
    expect(isPathWithinDirectory(testPath, allowedDir)).toBe(true);
  });
});

describe('validateAndResolvePath', () => {
  const allowedDir = '/tmp';

  it('should resolve absolute path within allowed directory', () => {
    const inputPath = '/tmp/test.txt';
    const result = validateAndResolvePath(inputPath, allowedDir);
    expect(result).toBe('/tmp/test.txt');
  });

  it('should resolve relative path with basePath', () => {
    const inputPath = 'test.txt';
    const basePath = '/tmp';
    const result = validateAndResolvePath(inputPath, allowedDir, basePath);
    expect(result).toBe('/tmp/test.txt');
  });

  it('should throw error for path outside allowed directory', () => {
    const inputPath = '/etc/passwd';
    expect(() => validateAndResolvePath(inputPath, allowedDir)).toThrow('Path traversal detected');
  });

  it('should throw error for path traversal', () => {
    const inputPath = '../../../etc/passwd';
    const basePath = '/tmp/subdir';
    expect(() => validateAndResolvePath(inputPath, allowedDir, basePath)).toThrow('Path traversal detected');
  });

  it('should handle absolute input path without basePath', () => {
    const inputPath = '/tmp/absolute.txt';
    const result = validateAndResolvePath(inputPath, allowedDir);
    expect(result).toBe('/tmp/absolute.txt');
  });
});