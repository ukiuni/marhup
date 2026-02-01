/**
 * ファイルロックユーティリティ
 * 同時実行時のファイル競合を防ぐ
 */

import * as fs from 'fs';
import { setTimeout } from 'timers/promises';
import { MarhupError } from '../errors.js';
import { t } from './i18n.js';

export class FileLock {
  private lockFilePath: string;
  private acquired = false;
  private timeoutMs = 30000; // 30秒タイムアウト

  constructor(filePath: string, timeoutMs?: number) {
    this.lockFilePath = `${filePath}.lock`;
    if (timeoutMs !== undefined) {
      this.timeoutMs = timeoutMs;
    }
  }

  /**
   * ロックを取得（ブロッキング）
   */
  async acquire(): Promise<boolean> {
    if (this.acquired) {
      return true;
    }

    const startTime = Date.now();

    while (Date.now() - startTime < this.timeoutMs) {
      try {
        // ロックファイルが存在するかチェック
        if (fs.existsSync(this.lockFilePath)) {
          // ロックファイルの内容を読み取る
          const content = fs.readFileSync(this.lockFilePath, 'utf-8').trim();
          const lines = content.split('\n');
          if (lines.length >= 2) {
            const pid = parseInt(lines[0], 10);
            const timestamp = parseInt(lines[1], 10);

            // 同じプロセスからのロックかチェック
            if (pid === process.pid) {
              this.acquired = true;
              return true;
            }

            // 古いロックかチェック（5分以上経過）
            const age = Date.now() - timestamp;
            if (age > 5 * 60 * 1000) {
              // 古いロックファイルを削除
              fs.unlinkSync(this.lockFilePath);
            } else {
              // ロック中、待機
              await setTimeout(100); // 100ms待機
              continue;
            }
          } else {
            // 不正なロックファイル、削除
            fs.unlinkSync(this.lockFilePath);
          }
        }

        // ロックファイルを作成（'wx'フラグで存在する場合失敗）
        fs.writeFileSync(this.lockFilePath, `${process.pid}\n${Date.now()}`, { flag: 'wx', encoding: 'utf-8' });
        this.acquired = true;
        return true;
      } catch (error: unknown) {
        if ((error as any).code === 'EEXIST') {
          // ファイルが存在する、待機して再試行
          await setTimeout(100);
          continue;
        }
        // その他のエラー
        return false;
      }
    }

    // タイムアウト
    return false;
  }

  /**
   * ロックを解放
   */
  release(): void {
    if (this.acquired && fs.existsSync(this.lockFilePath)) {
      try {
        // ロックファイルの内容を確認（同じプロセスか）
        const content = fs.readFileSync(this.lockFilePath, 'utf-8').trim();
        const lines = content.split('\n');
        if (lines.length >= 1 && parseInt(lines[0], 10) === process.pid) {
          fs.unlinkSync(this.lockFilePath);
        }
      } catch (error) {
        console.warn(t('errors.lockFileDeletionFailed', { error }));
      }
    }
    this.acquired = false;
  }

  /**
   * ロックが取得されているか
   */
  isAcquired(): boolean {
    return this.acquired;
  }
}

/**
 * ファイル操作をアトミックに行うためのロック付き実行
 */
export async function withFileLock<T>(
  filePath: string,
  operation: () => Promise<T>
): Promise<T> {
  const lock = new FileLock(filePath);

  if (!(await lock.acquire())) {
    throw new MarhupError(
      t('errors.fileInUse', { path: filePath }),
      'FILE_LOCKED',
      t('errors.suggestionWaitOrChangeOutput'),
      filePath
    );
  }

  try {
    return await operation();
  } finally {
    lock.release();
  }
}