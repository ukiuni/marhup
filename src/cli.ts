#!/usr/bin/env node
/**
 * md2ppt CLI
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { md2pptFile } from './index.js';

const program = new Command();

program
  .name('md2ppt')
  .description('Markdownからグリッドベースのレイアウトで PowerPoint (PPTX) を生成')
  .version('0.1.0')
  .argument('<input>', '入力Markdownファイル')
  .option('-o, --output <file>', '出力ファイル名', 'output.pptx')
  .option('-t, --theme <name>', 'テーマ名', 'default')
  .option('-w, --watch', '監視モード', false)
  .option('--grid <size>', 'デフォルトグリッドサイズ', '12x9')
  .action(async (input: string, options: {
    output: string;
    theme: string;
    watch: boolean;
    grid: string;
  }) => {
    try {
      // 入力ファイルの存在確認
      const inputPath = path.resolve(input);
      if (!fs.existsSync(inputPath)) {
        console.error(`エラー: ファイルが見つかりません: ${inputPath}`);
        process.exit(1);
      }

      // 出力パス
      const outputPath = path.resolve(options.output);

      console.log(`📝 ${input} を変換中...`);

      // 変換実行
      await md2pptFile(inputPath, {
        output: outputPath,
        theme: options.theme,
        grid: options.grid,
      });

      console.log(`✅ 生成完了: ${outputPath}`);

      // 監視モード
      if (options.watch) {
        console.log('\n👀 監視モード開始... (Ctrl+C で終了)');

        fs.watch(inputPath, async (eventType) => {
          if (eventType === 'change') {
            console.log(`\n🔄 変更を検出: ${input}`);
            try {
              await md2pptFile(inputPath, {
                output: outputPath,
                theme: options.theme,
                grid: options.grid,
              });
              console.log(`✅ 再生成完了: ${outputPath}`);
            } catch (error) {
              console.error('❌ 変換エラー:', error);
            }
          }
        });
      }
    } catch (error) {
      console.error('❌ エラー:', error);
      process.exit(1);
    }
  });

program.parse();
