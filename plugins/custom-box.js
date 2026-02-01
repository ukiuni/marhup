/**
 * Sample Plugin: Custom Box Element
 * Demonstrates how to add a custom element type
 */

// Removed imports for sandboxing

const customBoxParser = (token, aliases, gridConfig) => {
  // Check if this is a custom box: :::custombox content :::
  if (token.type === 'paragraph') {
    const text = (token as any).text || '';
    const match = text.match(/^:::custombox\s+(.+?)\s*:::$/);
    if (match) {
      return {
        type: 'custombox',
        content: match[1], // Note: In production plugins, sanitize content to prevent XSS
        raw: text,
      };
    }
  }
  return null;
};

const customBoxGenerator = async (element, slide, context) => {
  // Add a text box with custom styling
  slide.addText(element.content, {
    x: context.coords.x,
    y: context.coords.y,
    w: context.coords.w,
    h: context.coords.h,
    fontSize: 24,
    color: 'FF0000', // Red text
    fill: { color: 'FFFF00' }, // Yellow background
    ...context.styleProps,
  });
  return [];
};

const plugin = {
  name: 'custom-box',
  version: '1.0.0',
  description: 'Adds a custom box element type',
  elementParsers: {
    paragraph: customBoxParser, // Override paragraph parser to check for custom syntax
  },
  elementGenerators: {
    custombox: customBoxGenerator,
  },
};

module.exports = plugin;