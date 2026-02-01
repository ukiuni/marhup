# Plugin Development Guide

marhup supports a plugin architecture that allows you to extend its functionality with custom elements, parsers, and generators.

## Plugin Structure

A plugin is a JavaScript or TypeScript module that exports a default object with the following interface:

```typescript
interface Plugin {
  name: string;
  version?: string;
  description?: string;
  elementParsers?: Record<string, ElementParser>;
  elementGenerators?: Record<string, ElementGenerator>;
  hooks?: {
    onInit?: (context: PluginContext) => void;
    onParse?: (document: ParsedDocument) => ParsedDocument;
    onGenerate?: (presentation: any) => any;
  };
}
```

## Element Parsers

Element parsers convert marked tokens into SlideElement objects. They are called during the markdown parsing phase.

```typescript
type ElementParser = (token: Token, aliases?: Record<string, string>) => SlideElement | null;
```

Example: Adding a custom element type

```javascript
const customParser = (token, aliases) => {
  if (token.type === 'paragraph') {
    const match = token.text.match(/^:::myelement\s+(.+?)\s*:::$/);
    if (match) {
      return {
        type: 'myelement',
        content: match[1],
        raw: token.raw,
      };
    }
  }
  return null;
};

const plugin = {
  name: 'my-plugin',
  elementParsers: {
    paragraph: customParser, // Override paragraph parsing
  },
};
```

## Element Generators

Element generators add elements to PowerPoint slides. They are called during the PPTX generation phase.

```typescript
type ElementGenerator = (element: PlacedElement, slide: ISlide, context: ElementGeneratorContext) => Promise<string[]>;
```

The context provides:
- `grid`: Grid configuration
- `slideData`: Slide data
- `theme`: Theme configuration
- `basePath`: Base path for assets
- `coords`: Calculated coordinates
- `styleProps`: Resolved style properties

Example: Generating a custom element

```javascript
const customGenerator = async (element, slide, context) => {
  slide.addText(element.content, {
    x: context.coords.x,
    y: context.coords.y,
    w: context.coords.w,
    h: context.coords.h,
    ...context.styleProps,
  });
  return []; // Return array of temporary files created
};

const plugin = {
  name: 'my-plugin',
  elementGenerators: {
    myelement: customGenerator,
  },
};
```

## Hooks

Hooks allow you to run code at specific points in the processing pipeline.

- `onInit`: Called after plugin loading, receives PluginContext with logger and options
- `onParse`: Called after markdown parsing, can modify the ParsedDocument
- `onGenerate`: Called after PPTX generation (not implemented yet)

Example: Using hooks

```javascript
const plugin = {
  name: 'my-plugin',
  hooks: {
    onInit: (context) => {
      context.logger.info('Plugin initialized');
    },
    onParse: (document) => {
      // Modify document
      return document;
    },
  },
};
```

## Loading Plugins

Plugins are loaded from a directory specified with the `--plugin-dir` option:

```bash
marhup input.md --plugin-dir ./my-plugins
```

The directory should contain `.js` or `.ts` files, each exporting a default Plugin object.

## Best Practices

1. **Error Handling**: Wrap plugin code in try-catch blocks and use the provided logger
2. **Type Safety**: Use TypeScript for better development experience
3. **Documentation**: Document your plugin's custom syntax and features
4. **Compatibility**: Test with different themes and grid configurations
5. **Performance**: Avoid heavy computations in parsers; defer to generators if possible

## Example Plugin

See `plugins/custom-box.js` for a complete example that adds a custom element type with special styling.