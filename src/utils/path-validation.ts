/**
 * Path validation utilities to prevent directory traversal attacks
 */

import * as path from 'path';

/**
 * Check if a resolved path is within the allowed directory
 * @param resolvedPath - The absolute path to check
 * @param allowedDir - The absolute path of the allowed directory
 * @returns true if the path is safe (within allowedDir or subdirectories)
 */
export function isPathWithinDirectory(resolvedPath: string, allowedDir: string): boolean {
  const normalizedPath = path.normalize(resolvedPath);
  const normalizedAllowed = path.normalize(allowedDir);

  // Ensure allowedDir ends with separator for proper prefix check
  const allowedWithSep = normalizedAllowed.endsWith(path.sep) ? normalizedAllowed : normalizedAllowed + path.sep;

  return normalizedPath.startsWith(allowedWithSep) || normalizedPath === normalizedAllowed;
}

/**
 * Validate and resolve a file path, ensuring it's within the allowed directory
 * @param inputPath - The input path (can be relative or absolute)
 * @param allowedDir - The absolute path of the allowed directory
 * @param basePath - Optional base path for relative resolution
 * @returns The resolved absolute path if valid
 * @throws Error if the path is outside the allowed directory
 */
export function validateAndResolvePath(inputPath: string, allowedDir: string, basePath?: string): string {
  let resolvedPath: string;

  if (basePath && !path.isAbsolute(inputPath)) {
    resolvedPath = path.resolve(basePath, inputPath);
  } else {
    resolvedPath = path.resolve(inputPath);
  }

  if (!isPathWithinDirectory(resolvedPath, allowedDir)) {
    throw new Error(`Path traversal detected: ${inputPath} resolves to ${resolvedPath} which is outside allowed directory ${allowedDir}`);
  }

  return resolvedPath;
}