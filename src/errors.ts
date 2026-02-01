/**
 * Custom error classes for better error messages
 */

export class MarhupError extends Error {
  constructor(
    message: string,
    public code?: string,
    public suggestion?: string,
    public filePath?: string,
    public lineNumber?: number
  ) {
    super(message);
    this.name = 'MarhupError';
  }

  toString(): string {
    let output = this.name + ': ' + this.message;

    if (this.filePath) {
      output += '\nFile: ' + this.filePath;
      if (this.lineNumber) {
        output += ':' + this.lineNumber;
      }
    }

    if (this.suggestion) {
      output += '\nSuggestion: ' + this.suggestion;
    }

    if (this.code) {
      output += '\nError Code: ' + this.code;
    }

    return output;
  }
}

export class FrontmatterError extends MarhupError {
  constructor(
    message: string,
    key?: string,
    value?: unknown,
    suggestion?: string,
    filePath?: string,
    lineNumber?: number
  ) {
    const fullMessage = key ? 'Front Matter validation failed for \'' + key + '\': ' + message : 'Front Matter error: ' + message;
    super(fullMessage, 'FRONTMATTER_ERROR', suggestion, filePath, lineNumber);
    this.name = 'FrontmatterError';
  }
}

export class GridError extends MarhupError {
  constructor(
    message: string,
    position?: { colStart: number; colEnd: number; rowStart: number; rowEnd: number },
    suggestion?: string,
    filePath?: string,
    lineNumber?: number
  ) {
    const posStr = position ? ' at position [' + position.colStart + '-' + position.colEnd + ', ' + position.rowStart + '-' + position.rowEnd + ']' : '';
    super('Grid error' + posStr + ': ' + message, 'GRID_ERROR', suggestion, filePath, lineNumber);
    this.name = 'GridError';
  }
}

export class ParseError extends MarhupError {
  constructor(
    message: string,
    element?: string,
    suggestion?: string,
    filePath?: string,
    lineNumber?: number
  ) {
    const elementStr = element ? ' in ' + element : '';
    super('Parse error' + elementStr + ': ' + message, 'PARSE_ERROR', suggestion, filePath, lineNumber);
    this.name = 'ParseError';
  }
}

export class GenerationError extends MarhupError {
  constructor(
    message: string,
    elementType?: string,
    suggestion?: string,
    filePath?: string,
    lineNumber?: number
  ) {
    const typeStr = elementType ? ' for ' + elementType : '';
    super('Generation error' + typeStr + ': ' + message, 'GENERATION_ERROR', suggestion, filePath, lineNumber);
    this.name = 'GenerationError';
  }
}