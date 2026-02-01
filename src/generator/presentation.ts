/**
 * Presentation abstraction layer to reduce dependency on external libraries
 */

import PptxGenJS from 'pptxgenjs';
import type { AnimationConfig } from '../types/index.js';

// Interfaces for abstraction
export interface PresentationOptions {
  title?: string;
  author?: string;
  layout?: string;
}

export interface SlideOptions {
  master?: string;
  transition?: {
    type?: string;
    duration?: number;
    direction?: string;
    speed?: string;
  };
}

export interface TextOptions {
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: { style?: 'none' | 'dash' | 'dashHeavy' | 'dashLong' | 'dashLongHeavy' | 'dbl' | 'dotDash' | 'dotDotDash' | 'dotDotDashHeavy' | 'dotted' | 'dottedHeavy' | 'heavy' | 'sng' | 'wavy' | 'wavyDbl' | 'wavyHeavy'; color?: string };
  align?: 'left' | 'center' | 'right' | 'justify';
  valign?: 'top' | 'middle' | 'bottom';
  margin?: number;
  bullet?: boolean;
  indentLevel?: number;
  fontFace?: string;
  shadow?: {
    type: 'none' | 'outer' | 'inner';
    color: string;
    blur: number;
    offset: number;
    angle: number;
  };
  animation?: {
    type: string;
    duration?: number;
    delay?: number;
  };
}

export interface ImageOptions {
  sizing?: {
    type: 'contain' | 'cover' | 'crop';
    w: number;
    h: number;
    x?: number;
    y?: number;
  };
  altText?: string;
  animation?: {
    type: string;
    duration?: number;
    delay?: number;
  };
}

export interface TableOptions {
  colW?: number[];
  animation?: {
    type: string;
    duration?: number;
    delay?: number;
  };
}

export interface CodeOptions {
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  animation?: {
    type: string;
    duration?: number;
    delay?: number;
  };
}

export interface MediaOptions {
  type: 'video' | 'audio';
  animation?: {
    type: string;
    duration?: number;
    delay?: number;
  };
}

export interface ISlide {
  addText(text: string, options: TextOptions & { x: number; y: number; w: number; h: number }): void;
  addImage(path: string, options: ImageOptions & { x: number; y: number; w: number; h: number }): void;
  addMedia(path: string, options: MediaOptions & { x: number; y: number; w: number; h: number }): void;
  addTable(rows: string[][], options: TableOptions & { x: number; y: number; w: number; h: number }): void;
  addShape(shape: string, options: { x: number; y: number; w: number; h: number; fill?: string | { color: string }; line?: string | { color: string } }): void;
  setTransition(transition: { type?: string; duration?: number; direction?: string; speed?: string }): void;
}

export interface IPresentation {
  addSlide(options?: SlideOptions): ISlide;
  defineSlideMaster(options: { title: string; background?: { color?: string }; margin?: [number, number, number, number] }): void;
  writeFile(options: { fileName: string }): Promise<void>;
  setTitle(title: string): void;
  setAuthor(author: string): void;
  setLayout(layout: string): void;
}

// PptxGenJS implementation
class PptxSlide implements ISlide {
  private animations: { index: number; animation: AnimationConfig }[] = [];
  private objectIndex = 0;

  constructor(private slide: PptxGenJS.Slide) {}

  addText(text: string, options: TextOptions & { x: number; y: number; w: number; h: number }): void {
    const { x, y, w, h, animation, ...textOpts } = options;
    const textOptions: TextOptions & { x: number; y: number; w: number; h: number } = {
      x,
      y,
      w,
      h,
      ...textOpts,
      shadow: textOpts.shadow ? {
        type: textOpts.shadow.type as 'outer' | 'inner',
        color: textOpts.shadow.color,
        blur: textOpts.shadow.blur,
        offset: textOpts.shadow.offset,
        angle: textOpts.shadow.angle,
      } : undefined,
    };

    if (animation) {
      textOptions.animation = animation;
    }

    this.slide.addText(text, textOptions);

    this.objectIndex++;
  }

  addImage(path: string, options: ImageOptions & { x: number; y: number; w: number; h: number }): void {
    const { x, y, w, h, animation, ...imgOpts } = options;
    const imageOptions: ImageOptions & { x: number; y: number; w: number; h: number; path: string } = {
      path,
      x,
      y,
      w,
      h,
      ...imgOpts,
    };

    if (animation) {
      imageOptions.animation = animation;
    }

    this.slide.addImage(imageOptions);

    this.objectIndex++;
  }

  addMedia(path: string, options: MediaOptions & { x: number; y: number; w: number; h: number }): void {
    const { x, y, w, h, animation, ...mediaOpts } = options;
    const mediaOptions: MediaOptions & { x: number; y: number; w: number; h: number; path: string } = {
      path,
      x,
      y,
      w,
      h,
      ...mediaOpts,
    };

    if (animation) {
      mediaOptions.animation = animation;
    }

    this.slide.addMedia(mediaOptions);

    this.objectIndex++;
  }

  addTable(rows: string[][], options: TableOptions & { x: number; y: number; w: number; h: number }): void {
    const { x, y, w, h, animation, ...tableOpts } = options;
    const tableOptions: TableOptions & { x: number; y: number; w: number; h: number } = {
      x,
      y,
      w,
      h,
      ...tableOpts,
    };

    if (animation) {
      tableOptions.animation = animation;
    }

    this.slide.addTable(rows as PptxGenJS.TableCell[][], tableOptions);

    this.objectIndex++;
  }

  addShape(shape: string, options: { x: number; y: number; w: number; h: number; fill?: string | { color: string }; line?: string | { color: string } }): void {
    const { x, y, w, h, ...shapeOpts } = options;
    const shapeOptions: { x: number; y: number; w: number; h: number; fill?: PptxGenJS.ShapeFillProps; line?: PptxGenJS.ShapeLineProps } = {
      x,
      y,
      w,
      h,
      fill: typeof shapeOpts.fill === 'string' ? { color: shapeOpts.fill } : shapeOpts.fill,
      line: typeof shapeOpts.line === 'string' ? { color: shapeOpts.line } : shapeOpts.line,
    };

    this.slide.addShape(shape as PptxGenJS.SHAPE_NAME, shapeOptions);
  }

  setTransition(transition: { type?: string; duration?: number; direction?: string; speed?: string }): void {
    if (transition.type && transition.type !== 'none') {
      try {
        (this.slide as any).transition = {
          type: transition.type,
          ...(transition.duration && { duration: transition.duration }),
          ...(transition.direction && { dir: transition.direction }),
          ...(transition.speed && { speed: transition.speed }),
        };
      } catch (error) {
        console.warn('Slide transition not supported in this version of PptxGenJS:', error);
      }
    }
  }

  getAnimations(): { index: number; animation: AnimationConfig }[] {
    return this.animations;
  }
}

class PptxPresentation implements IPresentation {
  private pptx: PptxGenJS;
  private slides: PptxSlide[] = [];

  constructor(options: PresentationOptions = {}) {
    this.pptx = new PptxGenJS();
    if (options.layout) this.pptx.layout = options.layout;
    if (options.title) this.pptx.title = options.title;
    if (options.author) this.pptx.author = options.author;
  }

  addSlide(options?: SlideOptions): ISlide {
    const slide = options?.master ? this.pptx.addSlide(options.master) : this.pptx.addSlide();
    const pptxSlide = new PptxSlide(slide);
    this.slides.push(pptxSlide);
    
    if (options?.transition) {
      pptxSlide.setTransition(options.transition);
    }
    
    return pptxSlide;
  }

  defineSlideMaster(options: { title: string; background?: { color?: string }; margin?: [number, number, number, number] }): void {
    this.pptx.defineSlideMaster(options);
  }

  async writeFile(options: { fileName: string }): Promise<void> {
    await this.pptx.writeFile(options);
  }

  setTitle(title: string): void {
    this.pptx.title = title;
  }

  setAuthor(author: string): void {
    this.pptx.author = author;
  }

  setLayout(layout: string): void {
    this.pptx.layout = layout;
  }
}

// Factory function with version checking
export function createPresentation(options?: PresentationOptions): IPresentation {
  // Check PptxGenJS version for compatibility
  const version = (PptxGenJS as any).version || 'unknown';
  console.log(`Using PptxGenJS version: ${version}`);

  // You could add version-specific logic here
  // For example, if version < some threshold, use a different implementation

  return new PptxPresentation(options);
}

export function createSlide(presentation: IPresentation, options?: SlideOptions): ISlide {
  return presentation.addSlide(options);
}

// Export interfaces for use in other modules