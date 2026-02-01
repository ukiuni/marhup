/**
 * Mermaid図の生成モジュール
 */

import type PptxGenJS from 'pptxgenjs';
import type { PlacedElement } from '../layout/index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

interface Coordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

// 一時ファイル用のディレクトリ
const TEMP_DIR = path.join(os.tmpdir(), 'marhup-mermaid');

/**
 * 一時ディレクトリを作成
 */
function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Mermaid記法からPNG画像を生成
 */
async function renderMermaidToPng(mermaidCode: string): Promise<Buffer | null> {
  ensureTempDir();
  
  const timestamp = Date.now();
  const inputFile = path.join(TEMP_DIR, `mermaid-${timestamp}.mmd`);
  const outputFile = path.join(TEMP_DIR, `mermaid-${timestamp}.png`);
  
  try {
    // Mermaidコードを一時ファイルに書き込み
    fs.writeFileSync(inputFile, mermaidCode, 'utf-8');
    
    // mmdc (mermaid-cli) を使ってPNGに変換
    // puppeteerの新しい設定を使用
    const configFile = path.join(TEMP_DIR, `puppeteer-${timestamp}.json`);
    fs.writeFileSync(configFile, JSON.stringify({
      executablePath: undefined, // システムのChromiumを使用
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }));
    
    execSync(`npx mmdc -i "${inputFile}" -o "${outputFile}" -b transparent -s 2`, {
      stdio: 'pipe',
      timeout: 30000,
    });
    
    // 生成された画像を読み込み
    if (fs.existsSync(outputFile)) {
      const buffer = fs.readFileSync(outputFile);
      
      // 一時ファイルを削除
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
      if (fs.existsSync(configFile)) {
        fs.unlinkSync(configFile);
      }
      
      return buffer;
    }
  } catch (error) {
    console.warn('Mermaid図の生成に失敗しました:', error);
    // 一時ファイルをクリーンアップ
    if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  }
  
  return null;
}

/**
 * Mermaid図をSVGとして生成（フォールバック用）
 */
async function renderMermaidToSvg(mermaidCode: string): Promise<string | null> {
  ensureTempDir();
  
  const timestamp = Date.now();
  const inputFile = path.join(TEMP_DIR, `mermaid-${timestamp}.mmd`);
  const outputFile = path.join(TEMP_DIR, `mermaid-${timestamp}.svg`);
  
  try {
    fs.writeFileSync(inputFile, mermaidCode, 'utf-8');
    
    execSync(`npx mmdc -i "${inputFile}" -o "${outputFile}" -b transparent`, {
      stdio: 'pipe',
      timeout: 30000,
    });
    
    if (fs.existsSync(outputFile)) {
      const svg = fs.readFileSync(outputFile, 'utf-8');
      
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
      
      return svg;
    }
  } catch (error) {
    console.warn('Mermaid SVG生成に失敗:', error);
    if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  }
  
  return null;
}

/**
 * Mermaid要素を追加
 */
export async function addMermaidElement(
  slide: PptxGenJS.Slide,
  element: PlacedElement,
  coords: Coordinates,
  _styleProps: Record<string, unknown>
): Promise<void> {
  const mermaidCode = element.content as string;
  
  // PNGで試行
  const pngBuffer = await renderMermaidToPng(mermaidCode);
  
  if (pngBuffer) {
    const base64 = pngBuffer.toString('base64');
    slide.addImage({
      data: `data:image/png;base64,${base64}`,
      x: coords.x,
      y: coords.y,
      w: coords.w,
      h: coords.h,
      sizing: { type: 'contain', w: coords.w, h: coords.h },
    });
    return;
  }
  
  // SVGでフォールバック
  const svg = await renderMermaidToSvg(mermaidCode);
  
  if (svg) {
    const base64 = Buffer.from(svg).toString('base64');
    slide.addImage({
      data: `data:image/svg+xml;base64,${base64}`,
      x: coords.x,
      y: coords.y,
      w: coords.w,
      h: coords.h,
      sizing: { type: 'contain', w: coords.w, h: coords.h },
    });
    return;
  }
  
  // 失敗した場合はプレースホルダーを表示
  addMermaidPlaceholder(slide, coords, mermaidCode);
}

/**
 * Mermaidプレースホルダーを追加（生成失敗時）
 */
function addMermaidPlaceholder(
  slide: PptxGenJS.Slide,
  coords: Coordinates,
  mermaidCode: string
): void {
  slide.addShape('rect', {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fill: { color: 'f5f5f5' },
    line: { color: 'cccccc', width: 1 },
  });

  // Mermaidコードの最初の行を表示
  const firstLine = mermaidCode.split('\n')[0].trim();
  const displayText = `[Mermaid: ${firstLine}...]`;
  
  slide.addText(displayText, {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fontSize: 10,
    color: '666666',
    align: 'center',
    valign: 'middle',
    fontFace: 'Courier New',
  });
}
