/**
 * テーブル要素の生成
 */

import type PptxGenJS from 'pptxgenjs';
import type { PlacedElement } from '../layout/index';
import type { TableData } from '../types/index';
import { defaultTheme } from '../theme/index';

interface Coordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * テーブル要素を追加
 */
export function addTableElement(
  slide: PptxGenJS.Slide,
  element: PlacedElement,
  coords: Coordinates,
  _styleProps: Record<string, unknown>
): void {
  const tableData = element.content as TableData;

  // ヘッダー行
  const headerRow: PptxGenJS.TableCell[] = tableData.headers.map((header) => ({
    text: header,
    options: {
      fill: { color: defaultTheme.colors.primary.replace('#', '') },
      color: 'ffffff',
      bold: true,
      fontSize: defaultTheme.fontSize.body - 2,
      fontFace: defaultTheme.fonts.body,
      align: 'center',
      valign: 'middle',
    },
  }));

  // データ行
  const dataRows: PptxGenJS.TableCell[][] = tableData.rows.map((row, rowIndex) =>
    row.map((cell) => ({
      text: cell,
      options: {
        fill: { color: rowIndex % 2 === 0 ? 'ffffff' : 'f8fafc' },
        color: defaultTheme.colors.text.replace('#', ''),
        fontSize: defaultTheme.fontSize.body - 2,
        fontFace: defaultTheme.fonts.body,
        align: 'left',
        valign: 'middle',
      },
    }))
  );

  const allRows = [headerRow, ...dataRows];

  slide.addTable(allRows, {
    x: coords.x,
    y: coords.y,
    w: coords.w,
    h: coords.h,
    border: { type: 'solid', color: 'e2e8f0', pt: 1 },
    colW: Array(tableData.headers.length).fill(coords.w / tableData.headers.length),
  });
}
