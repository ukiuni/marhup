/**
 * Mermaid図の生成モジュール
 */

import type { PlacedElement } from '../layout/index.js';
import type { AnimationConfig } from '../types/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { t } from '../utils/i18n.js';
import type { ISlide } from './presentation.js';

interface Coordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

// 一時ファイル用のディレクトリ（プロセスごとにユニーク）
let TEMP_DIR: string | null = null;

/**
 * プロセス固有の一時ディレクトリを取得
 */
function getTempDir(): string {
  if (!TEMP_DIR) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    TEMP_DIR = path.join(os.tmpdir(), `marhup-mermaid-${timestamp}-${randomId}`);
  }
  return TEMP_DIR;
}

/**
 * 一時ディレクトリを作成
 */
function ensureTempDir(): void {
  const tempDir = getTempDir();
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
}

/**
 * 一時ディレクトリをクリーンアップ
 */
function cleanupTempDir(): void {
  if (TEMP_DIR && fs.existsSync(TEMP_DIR)) {
    try {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
      TEMP_DIR = null; // 参照をクリア
    } catch (error) {
      console.warn(t('errors.cleanupTempDirFailed', { error }));
    }
  }
}

// プロセス終了時にクリーンアップ
process.on('exit', cleanupTempDir);
process.on('SIGINT', cleanupTempDir);
process.on('SIGTERM', cleanupTempDir);
process.on('uncaughtException', cleanupTempDir);

// エクスポート（クリーンアップ用）
export { cleanupTempDir };

/**
 * Mermaid記法からPNG画像を生成
 */
async function renderMermaidToPng(mermaidCode: string): Promise<string | null> {
  ensureTempDir();
  const tempDir = getTempDir();
  
  const timestamp = Date.now();
  const inputFile = path.join(tempDir, `mermaid-${timestamp}.mmd`);
  const outputFile = path.join(tempDir, `mermaid-${timestamp}.png`);
  const configFile = path.join(tempDir, `puppeteer-${timestamp}.json`);
  
  let filesToCleanup: string[] = [];
  
  try {
    // Mermaidコードを一時ファイルに書き込み
    fs.writeFileSync(inputFile, mermaidCode, 'utf-8');
    filesToCleanup.push(inputFile);
    
    // mmdc (mermaid-cli) を使ってPNGに変換
    // puppeteerの新しい設定を使用
    fs.writeFileSync(configFile, JSON.stringify({
      executablePath: undefined, // システムのChromiumを使用
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }));
    filesToCleanup.push(configFile);
    
    execSync(`npx mmdc -i "${inputFile}" -o "${outputFile}" -b transparent -s 2`, {
      stdio: 'pipe',
      timeout: 30000,
    });
    
    // 生成された画像ファイルのパスを返す
    if (fs.existsSync(outputFile)) {
      // 成功時はoutputFileをクリーンアップ対象から除外（呼び出し元で管理）
      filesToCleanup = filesToCleanup.filter(f => f !== outputFile);
      return outputFile;
    }
  } catch (error) {
    console.warn(t('errors.mermaidGenerationFailed', { error }));
    // エラー時はoutputFileもクリーンアップ
    if (fs.existsSync(outputFile)) {
      filesToCleanup.push(outputFile);
    }
  } finally {
    // 一時ファイルをクリーンアップ
    for (const file of filesToCleanup) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (cleanupError) {
        console.warn(t('errors.cleanupTempFileFailed', { error: cleanupError }));
      }
    }
  }
  
  return null;
}

/**
 * Mermaid図をSVGとして生成（フォールバック用）
 */
async function renderMermaidToSvg(mermaidCode: string): Promise<string | null> {
  ensureTempDir();
  const tempDir = getTempDir();
  
  const timestamp = Date.now();
  const inputFile = path.join(tempDir, `mermaid-${timestamp}.mmd`);
  const outputFile = path.join(tempDir, `mermaid-${timestamp}.svg`);
  
  let filesToCleanup: string[] = [];
  
  try {
    fs.writeFileSync(inputFile, mermaidCode, 'utf-8');
    filesToCleanup.push(inputFile);
    
    execSync(`npx mmdc -i "${inputFile}" -o "${outputFile}" -b transparent`, {
      stdio: 'pipe',
      timeout: 30000,
    });
    
    if (fs.existsSync(outputFile)) {
      const svg = fs.readFileSync(outputFile, 'utf-8');
      
      // SVGを読み込んだらファイルをクリーンアップ
      filesToCleanup.push(outputFile);
      
      const base64 = Buffer.from(svg).toString('base64');
      // メモリ解放のため、変数をnull化
      let result = `data:image/svg+xml;base64,${base64}`;
      // svgとbase64をnull化
      return result;
    }
  } catch (error) {
    console.warn(t('errors.mermaidSvgGenerationFailed', { error }));
    // エラー時はoutputFileもクリーンアップ
    if (fs.existsSync(outputFile)) {
      filesToCleanup.push(outputFile);
    }
  } finally {
    // 一時ファイルをクリーンアップ
    for (const file of filesToCleanup) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (cleanupError) {
        console.warn(t('errors.cleanupTempFileFailed', { error: cleanupError }));
      }
    }
  }
  
  return null;
}

/**
 * Mermaid要素を追加
 */
export async function addMermaidElement(
  slide: ISlide,
  element: PlacedElement,
  coords: Coordinates,
  _styleProps: Record<string, unknown>,
  animation?: AnimationConfig
): Promise<string[]> {
  const mermaidCode = element.content as string;
  
  // PNGで試行
  const pngFile = await renderMermaidToPng(mermaidCode);
  
  if (pngFile) {
    slide.addImage(pngFile, {
      x: coords.x,
      y: coords.y,
      w: coords.w,
      h: coords.h,
      sizing: { type: 'contain', w: coords.w, h: coords.h },
      animation: animation ? {
        type: animation.type,
        duration: animation.duration,
        delay: animation.delay,
      } : undefined,
    });
    return [pngFile];
  }
  
  // SVGでフォールバック
  const svg = await renderMermaidToSvg(mermaidCode);
  
  if (svg) {
    slide.addImage(svg, {
      x: coords.x,
      y: coords.y,
      w: coords.w,
      h: coords.h,
      sizing: { type: 'contain', w: coords.w, h: coords.h },
      animation: animation ? {
        type: animation.type,
        duration: animation.duration,
        delay: animation.delay,
      } : undefined,
    });
    return [];
  }
  
  // 失敗した場合はプレースホルダーを表示
  addMermaidPlaceholder(slide, coords, mermaidCode);
  return [];
}

/**
 * Mermaidプレースホルダーを追加（生成失敗時）
 */
function addMermaidPlaceholder(
  slide: ISlide,
  coords: Coordinates,
  mermaidCode: string
): void {
  slide.addShape('rect', {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    fill: { color: 'f5f5f5' },
    line: 'cccccc',
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
  });
}
