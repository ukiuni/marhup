#!/usr/bin/env node
/**
 * marhup CLI
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import { marhupFile, parse, marhupFromJson, previewLayout } from './index.js';
import { MarhupError } from './errors.js';
import { validateAndResolvePath } from './utils/path-validation.js';
import { ConfigOptions } from './types/index.js';
import logger from './utils/logger.js';
import { initI18n, t, changeLanguage, getCurrentLanguage } from './utils/i18n.js';

// Detect language from command line arguments
const args = process.argv.slice(2);
let detectedLang: string | undefined;
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '-l' || args[i] === '--lang') && i + 1 < args.length) {
    detectedLang = args[i + 1];
    break;
  }
}

// Initialize i18n with detected language or auto-detect
await initI18n(detectedLang);

const program = new Command();

/**
 * Load configuration from file
 */
async function loadConfig(configPath?: string): Promise<ConfigOptions> {
  const cwd = process.cwd();

  if (configPath) {
    try {
      configPath = validateAndResolvePath(configPath, cwd);
    } catch (pathError) {
      const errorMessage = pathError instanceof Error ? pathError.message : String(pathError);
      console.warn(t('cli.messages.configPathInvalid', { configPath, error: errorMessage }));
      return {};
    }
  } else {
    // Try default locations
    const defaultPaths = ['.marhuprc', '.marhuprc.json', '.marhuprc.js', 'marhup.config.js'];
    for (const path of defaultPaths) {
      try {
        const resolved = validateAndResolvePath(path, cwd);
        if (fs.existsSync(resolved)) {
          configPath = resolved;
          break;
        }
      } catch {
        // Skip invalid default paths
      }
    }
  }

  if (!configPath || !fs.existsSync(configPath)) {
    return {};
  }

  try {
    if (configPath.endsWith('.js')) {
      // For JS files, use dynamic import
      const configModule = await import(path.resolve(configPath));
      const config = configModule.default || configModule;
      return config;
    } else {
      // For JSON files
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(t('cli.messages.configLoadFailed', { configPath }));
    console.warn(t('cli.messages.configLoadError', { error: error instanceof Error ? error.message : error }));
    return {};
  }
}

/**
 * Merge config options with CLI options, CLI takes precedence, then apply defaults
 */
function mergeOptions(cliOptions: any, configOptions: ConfigOptions): any {
  return {
    output: cliOptions.output || configOptions.output || 'output.pptx',
    outputDir: cliOptions.outputDir || configOptions.outputDir,
    theme: cliOptions.theme || configOptions.theme || 'default',
    grid: cliOptions.grid || configOptions.grid || '12x9',
    watch: cliOptions.watch || configOptions.watch || false,
    config: cliOptions.config,
    lang: cliOptions.lang || configOptions.lang || 'en',
    pluginDir: cliOptions.pluginDir || configOptions.pluginDir,
  };
}

/**
 * Format and display errors in a user-friendly way
 */
function handleError(error: unknown, context?: string): void {
  logger.error('CLI error occurred', { error: error instanceof Error ? error.message : String(error), context });

  if (error instanceof MarhupError) {
    console.error(`❌ ${error.name}: ${error.message}`);
    if (error.filePath) {
      console.error('   File: ' + error.filePath + (error.lineNumber ? ':' + error.lineNumber : ''));
    }
    if (error.suggestion) {
      console.error('   💡 ' + error.suggestion);
    }
    if (error.code) {
      console.error('   Code: ' + error.code);
    }
  } else if (error instanceof Error) {
    const contextMsg = context ? ` ${t(`errors.${context.replace(/ /g, '')}`, { defaultValue: context })}` : '';
    console.error(`❌ ${t('errors.processingFailed')}${contextMsg}: ${error.message}`);
    console.error(`   💡 ${t('errors.checkInputAndTryAgain')}`);
  } else {
    const contextMsg = context ? ` ${t(`errors.${context.replace(/ /g, '')}`, { defaultValue: context })}` : '';
    console.error(`❌ ${t('errors.unknownError')}${contextMsg}:`, error);
  }
  process.exit(1);
}

program
  .name(t('cli.name'))
  .description(t('cli.description'))
  .version(t('cli.version'))
  .option('-o, --output <file>', t('cli.options.output'))
  .option('-d, --output-dir <dir>', t('cli.options.outputDir'))
  .option('-t, --theme <name>', t('cli.options.theme'))
  .option('--grid <size>', t('cli.options.grid'))
  .option('-w, --watch', t('cli.options.watch'))
  .option('-c, --config <file>', t('cli.options.config'))
  .option('-l, --lang <language>', 'Language (en/ja)', 'en')
  .option('--plugin-dir <dir>', 'Plugin directory')
  .addHelpText('after', `
${t('cli.examples.basic')}
${t('cli.examples.theme')}
${t('cli.examples.watch')}
${t('cli.examples.batch')}

${t('cli.help.documentation')}`);

program
  .argument('<inputs...>', t('cli.options.inputFiles'))
  .action(async (inputs: string[], options: {
    output?: string;
    outputDir?: string;
    theme?: string;
    grid?: string;
    config?: string;
    lang?: string;
    pluginDir?: string;
  }) => {
    // Load and merge config
    const config = await loadConfig(options.config);
    const mergedOptions = mergeOptions(options, config);
    const cwd = process.cwd();

    // Validate pluginDir if specified
    if (mergedOptions.pluginDir) {
      try {
        mergedOptions.pluginDir = validateAndResolvePath(mergedOptions.pluginDir, cwd);
      } catch (error) {
        console.error(t('cli.messages.invalidPath', { path: mergedOptions.pluginDir, error: error instanceof Error ? error.message : String(error) }));
        process.exit(1);
      }
    }

    // Change language if specified
    if (mergedOptions.lang && mergedOptions.lang !== getCurrentLanguage()) {
      await changeLanguage(mergedOptions.lang);
    }

    logger.info('CLI started', { inputs, output: mergedOptions.output, outputDir: mergedOptions.outputDir, theme: mergedOptions.theme, grid: mergedOptions.grid });

    try {
      // Validate input file paths
      const inputPaths: string[] = [];
      for (const input of inputs) {
        try {
          const resolved = validateAndResolvePath(input, cwd);
          inputPaths.push(resolved);
        } catch (error) {
          console.error(t('cli.messages.invalidPath', { path: input, error: error instanceof Error ? error.message : String(error) }));
          process.exit(1);
        }
      }

      // Check input files exist
      const missingFiles = inputPaths.filter(inputPath => !fs.existsSync(inputPath));
      if (missingFiles.length > 0) {
        logger.error('Input files not found', { missingFiles });
        console.error(t('cli.messages.fileNotFound'));
        missingFiles.forEach(file => console.error(`  - ${file}`));
        process.exit(1);
      }

      // Check output directory if specified
      let outputDir: string | undefined;
      if (mergedOptions.outputDir) {
        try {
          outputDir = validateAndResolvePath(mergedOptions.outputDir, cwd);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
        } catch (error) {
          console.error(t('cli.messages.invalidPath', { path: mergedOptions.outputDir, error: error instanceof Error ? error.message : String(error) }));
          process.exit(1);
        }
      }

      if (inputs.length === 1) {
        // Single file case
        const inputPath = inputPaths[0];
        let outputPath: string;
        try {
          outputPath = validateAndResolvePath(mergedOptions.output, cwd);
        } catch (error) {
          console.error(t('cli.messages.invalidPath', { path: mergedOptions.output, error: error instanceof Error ? error.message : String(error) }));
          process.exit(1);
        }

        console.log(t('cli.messages.converting', { input: inputPath }));

        await marhupFile(inputPath, {
          output: outputPath,
          theme: mergedOptions.theme,
          grid: mergedOptions.grid,
          pluginDir: mergedOptions.pluginDir,
        });

        console.log(t('cli.messages.generationComplete', { output: outputPath }));
      } else {
        // Multiple files case
        if (mergedOptions.output !== 'output.pptx') {
          console.warn(t('cli.messages.outputDirIgnoreWarning'));
        }

        console.log(t('cli.messages.batchProcessing', { count: inputs.length }));

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          const inputPath = inputPaths[i];
          const outputPath = outputDir
            ? path.join(outputDir, path.basename(input, path.extname(input)) + '.pptx')
            : path.resolve(path.basename(input, path.extname(input)) + '.pptx');

          try {
            console.log(t('cli.messages.batchItem', { index: i + 1, total: inputs.length, input, output: outputPath }));
            await marhupFile(inputPath, {
              output: outputPath,
              theme: mergedOptions.theme,
              grid: mergedOptions.grid,
            });
            successCount++;
          } catch (error) {
            console.error(t('cli.messages.batchItemError', { input }));
            handleError(error, `processing ${input}`);
            errorCount++;
          }
        }

        console.log(t('cli.messages.batchComplete', { success: successCount, error: errorCount }));
      }
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate')
  .description(t('cli.commands.generate.description'))
  .argument('<inputs...>', t('cli.options.inputFiles'))
  .option('-o, --output <file>', t('cli.options.output'))
  .option('-d, --output-dir <dir>', t('cli.options.outputDir'))
  .option('-t, --theme <name>', t('cli.options.theme'))
  .option('--grid <size>', t('cli.options.grid'))
  .option('-c, --config <file>', t('cli.options.config'))
  .option('--plugin-dir <dir>', 'Plugin directory')
  .addHelpText('after', `
${t('cli.commands.generate.examples.basic')}
${t('cli.commands.generate.examples.theme')}
${t('cli.commands.generate.examples.batch')}`)
  .action(async (inputs: string[], options: {
    output?: string;
    outputDir?: string;
    theme?: string;
    grid?: string;
    config?: string;
    pluginDir?: string;
  }) => {
    try {
      // Load and merge config
      const config = await loadConfig(options.config);
      const mergedOptions = mergeOptions(options, config);
      const cwd = process.cwd();

      // Validate pluginDir if specified
      if (mergedOptions.pluginDir) {
        try {
          mergedOptions.pluginDir = validateAndResolvePath(mergedOptions.pluginDir, cwd);
        } catch (error) {
          console.error(t('cli.messages.invalidPath', { path: mergedOptions.pluginDir, error: error instanceof Error ? error.message : String(error) }));
          process.exit(1);
        }
      }

      // Validate input file paths
      const inputPaths: string[] = [];
      for (const input of inputs) {
        try {
          const resolved = validateAndResolvePath(input, cwd);
          inputPaths.push(resolved);
        } catch (error) {
          console.error(t('cli.messages.invalidPath', { path: input, error: error instanceof Error ? error.message : String(error) }));
          process.exit(1);
        }
      }

      // Check input files exist
      const missingFiles = inputPaths.filter(inputPath => !fs.existsSync(inputPath));
      if (missingFiles.length > 0) {
        console.error(t('cli.messages.fileNotFound'));
        missingFiles.forEach(file => console.error(`  - ${file}`));
        process.exit(1);
      }

      // Check output directory if specified
      let outputDir: string | undefined;
      if (mergedOptions.outputDir) {
        try {
          outputDir = validateAndResolvePath(mergedOptions.outputDir, cwd);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
        } catch (error) {
          console.error(t('cli.messages.invalidPath', { path: mergedOptions.outputDir, error: error instanceof Error ? error.message : String(error) }));
          process.exit(1);
        }
      }

      if (inputs.length === 1) {
        // Single file case
        const inputPath = inputPaths[0];
        let outputPath: string;
        try {
          outputPath = validateAndResolvePath(mergedOptions.output, cwd);
        } catch (error) {
          console.error(t('cli.messages.invalidPath', { path: mergedOptions.output, error: error instanceof Error ? error.message : String(error) }));
          process.exit(1);
        }

        console.log(t('cli.messages.converting', { input: inputPath }));

        await marhupFile(inputPath, {
          output: outputPath,
          theme: mergedOptions.theme,
          grid: mergedOptions.grid,
          pluginDir: mergedOptions.pluginDir,
        });

        console.log(t('cli.messages.generationComplete', { output: outputPath }));
      } else {
        // Multiple files case
        if (mergedOptions.output !== 'output.pptx') {
          console.warn(t('cli.messages.outputDirIgnoreWarning'));
        }

        console.log(t('cli.messages.batchProcessing', { count: inputs.length }));

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          const inputPath = inputPaths[i];

          try {
            // Determine output file name
            const inputBaseName = path.basename(input, path.extname(input));
            let outputPath: string;

            if (outputDir) {
              outputPath = path.join(outputDir, `${inputBaseName}.pptx`);
            } else {
              outputPath = path.join(path.dirname(inputPath), `${inputBaseName}.pptx`);
            }

            console.log(t('cli.messages.batchItemSuccess', { index: i + 1, total: inputs.length, input, output: path.relative(process.cwd(), outputPath) }));

            await marhupFile(inputPath, {
              output: outputPath,
              theme: mergedOptions.theme,
              grid: mergedOptions.grid,
              pluginDir: mergedOptions.pluginDir,
            });

            successCount++;
          } catch (error) {
            console.error(t('cli.messages.batchItemError', { input }));
            handleError(error, `processing ${input}`);
            errorCount++;
          }
        }

        console.log(`\n${t('cli.messages.batchComplete', { success: successCount, error: errorCount })}`);
      }
    } catch (error) {
      handleError(error, 'during PPTX generation');
    }
  });

program
  .command('undo')
  .description(t('cli.commands.undo.description'))
  .argument('<output>', t('cli.options.output'))
  .addHelpText('after', `
${t('cli.commands.undo.examples.basic')}

${t('cli.commands.undo.note')}`)
  .action((output: string) => {
    const outputPath = path.resolve(output);
    const outputDir = path.dirname(outputPath);
    const outputBase = path.basename(outputPath);

    // バックアップファイルを検索（新しい形式と古い形式の両方）
    const backupPattern = new RegExp(`^${outputBase}\\.bak(\\.\\d+\\.\\w+)?$`);
    let latestBackup: { path: string; mtime: number } | null = null;

    try {
      const files = fs.readdirSync(outputDir);
      for (const file of files) {
        if (backupPattern.test(file)) {
          const filePath = path.join(outputDir, file);
          const stats = fs.statSync(filePath);
          if (!latestBackup || stats.mtime.getTime() > latestBackup.mtime) {
            latestBackup = { path: filePath, mtime: stats.mtime.getTime() };
          }
        }
      }
    } catch (error) {
      console.error(t('cli.messages.backupSearchFailed', { error }));
      process.exit(1);
    }

    if (latestBackup) {
      fs.renameSync(latestBackup.path, outputPath);
      console.log(t('cli.messages.undoComplete', { output: outputPath }));
    } else {
      console.error(t('cli.messages.noBackupFound'));
      process.exit(1);
    }
  });

program
  .command('export')
  .description(t('cli.commands.export.description'))
  .argument('<input>', t('cli.options.inputFiles'))
  .option('-o, --output <file>', t('cli.options.output'), 'document.json')
  .addHelpText('after', `
${t('cli.commands.export.examples.basic')}`)
  .action((input: string, options: { output: string }) => {
    try {
      const inputPath = path.resolve(input);
      if (!fs.existsSync(inputPath)) {
        console.error(t('cli.messages.fileNotFound') + `: ${inputPath}`);
        process.exit(1);
      }

      const markdown = fs.readFileSync(inputPath, 'utf-8');
      const document = parse(markdown);

      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

      console.log(t('cli.messages.exportComplete', { output: outputPath }));
      // markdownをnull化
    } catch (error) {
      handleError(error, 'duringJsonExport');
    }
  });

program
  .command('import')
  .description(t('cli.commands.import.description'))
  .argument('<input>', t('cli.options.inputFiles'))
  .option('-o, --output <file>', t('cli.options.output'))
  .option('-t, --theme <name>', t('cli.options.theme'))
  .option('--grid <size>', t('cli.options.grid'))
  .option('-c, --config <file>', t('cli.options.config'))
  .addHelpText('after', `
${t('cli.commands.import.examples.basic')}`)
  .action(async (input: string, options: {
    output?: string;
    theme?: string;
    grid?: string;
    config?: string;
  }) => {
    try {
      // Load and merge config
      const config = await loadConfig(options.config);
      const mergedOptions = mergeOptions(options, config);

      const inputPath = path.resolve(input);
      if (!fs.existsSync(inputPath)) {
        console.error(t('cli.messages.fileNotFound') + `: ${inputPath}`);
        process.exit(1);
      }

      const outputPath = path.resolve(mergedOptions.output);

      console.log(t('cli.messages.processingFromJson', { input }));

      await marhupFromJson(inputPath, {
        output: outputPath,
        theme: mergedOptions.theme,
        grid: mergedOptions.grid,
      });

      console.log(t('cli.messages.generationComplete', { output: outputPath }));
    } catch (error) {
      handleError(error, 'duringPptxGenerationFromJson');
    }
  });

program
  .command('preview')
  .description(t('cli.commands.preview.description'))
  .argument('<input>', t('cli.options.inputFiles'))
  .option('--grid <size>', t('cli.options.grid'), '12x9')
  .addHelpText('after', `
${t('cli.commands.preview.examples.basic')}
${t('cli.commands.preview.examples.grid')}`)
  .action((input: string, options: { grid: string }) => {
    try {
      const inputPath = path.resolve(input);
      if (!fs.existsSync(inputPath)) {
        console.error(t('cli.messages.fileNotFound') + `: ${inputPath}`);
        process.exit(1);
      }

      const markdown = fs.readFileSync(inputPath, 'utf-8');

      console.log(t('cli.messages.layoutPreview', { input }));

      previewLayout(markdown, { grid: options.grid });
      // markdownをnull化
    } catch (error) {
      handleError(error, 'duringLayoutPreview');
    }
  });

program
  .command('watch')
  .description(t('cli.commands.watch.description'))
  .argument('<input>', t('cli.options.inputFiles'))
  .option('-o, --output <file>', t('cli.options.output'))
  .option('-t, --theme <name>', t('cli.options.theme'))
  .option('--grid <size>', t('cli.options.grid'))
  .option('-c, --config <file>', t('cli.options.config'))
  .addHelpText('after', `
${t('cli.commands.watch.examples.basic')}
${t('cli.commands.watch.examples.theme')}

${t('cli.commands.watch.note')}`)
  .action(async (input: string, options: {
    output?: string;
    theme?: string;
    grid?: string;
    config?: string;
  }) => {
    try {
      // Load and merge config
      const config = await loadConfig(options.config);
      const mergedOptions = mergeOptions(options, config);

      // Check input file exists
      const inputPath = path.resolve(input);
      if (!fs.existsSync(inputPath)) {
        console.error(t('cli.messages.fileNotFound') + `: ${inputPath}`);
        process.exit(1);
      }

      // Output path
      const outputPath = path.resolve(mergedOptions.output);

      console.log(t('cli.messages.initialConversion', { input }));
      await marhupFile(inputPath, {
        output: outputPath,
        theme: mergedOptions.theme,
        grid: mergedOptions.grid,
      });
      console.log(t('cli.messages.generationComplete', { output: outputPath }));

      console.log(t('cli.messages.watchModeStarted'));

      const watcher = chokidar.watch(inputPath, {
        persistent: true,
        ignoreInitial: true,
      });

      watcher.on('change', async () => {
        console.log(t('cli.messages.changeDetected', { input }));
        try {
          await marhupFile(inputPath, {
            output: outputPath,
            theme: mergedOptions.theme,
            grid: mergedOptions.grid,
          });
          console.log(t('cli.messages.regenerationComplete', { output: outputPath }));
        } catch (error) {
          handleError(error, 'duringWatchModeRegeneration');
        }
      });

      // Graceful shutdown
      process.on('SIGINT', () => {
        watcher.close();
        process.exit(0);
      });
    } catch (error) {
      handleError(error, 'duringInitialConversion');
    }
  });

// デフォルトコマンド（後方互換性）- 引数チェック
const rawArgs = process.argv.slice(2);
const firstArg = rawArgs[0];

if (firstArg && !program.commands.some(cmd => cmd.name() === firstArg) && !firstArg.startsWith('-')) {
  // サブコマンドが指定されていない場合（ファイルパスが最初の引数の場合）
  // 手動でオプションをパース
  const { inputs, options } = parseArgs(rawArgs);

  if (inputs.length === 0) {
    program.help();
    process.exit(0);
  }

  (async () => {
    try {
      // Load and merge config for backward compatibility
      const config = await loadConfig(options.config);
      const mergedOptions = mergeOptions(options, config);

      if (options.watch) {
        // Watch mode supports single file only
        if (inputs.length > 1) {
          console.error(t('cli.messages.watchSingleFileOnly'));
          process.exit(1);
        }
        // Delegate to watch command
        const watchCmd = program.commands.find(cmd => cmd.name() === 'watch');
        if (watchCmd) {
          await (watchCmd as any).action(inputs[0], mergedOptions);
        }
      } else {
        // generateコマンドに委譲
        const generateCmd = program.commands.find(cmd => cmd.name() === 'generate');
        if (generateCmd) {
          await (generateCmd as any).action(inputs, mergedOptions);
        }
      }
    } catch (error) {
      handleError(error, 'during processing');
    }
  })();
} else {
  // 通常のサブコマンド処理
  program.parse();
}

/**
 * 引数を手動でパースする関数
 */
function parseArgs(args: string[]): { inputs: string[], options: any } {
  const inputs: string[] = [];
  const options: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('-')) {
      switch (arg) {
        case '-o':
        case '--output':
          options.output = args[++i];
          break;
        case '-d':
        case '--output-dir':
          options.outputDir = args[++i];
          break;
        case '-t':
        case '--theme':
          options.theme = args[++i];
          break;
        case '--grid':
          options.grid = args[++i];
          break;
        case '-w':
        case '--watch':
          options.watch = true;
          break;
        case '-c':
        case '--config':
          options.config = args[++i];
          break;
        case '-l':
        case '--lang':
          options.lang = args[++i];
          break;
        default:
          // 未知のオプションは無視
          break;
      }
    } else {
      inputs.push(arg);
    }
  }

  return { inputs, options };
}
program
  .command('help')
  .description(t('cli.commands.help.description'))
  .action(() => {
    console.log(t('cli.help.title'));

    console.log(t('cli.help.basicUsage'));

    console.log(t('cli.help.codeExamples.basic'));
    console.log(t('cli.help.codeExamples.theme'));
    console.log(t('cli.help.codeExamples.watch'));
    console.log(t('cli.help.codeExamples.batch'));
    console.log(t('cli.help.codeExamples.config'));

    console.log(t('cli.help.configFiles'));
    console.log(t('cli.help.supportedFiles'));
    console.log(t('cli.help.configExamples'));
    console.log(t('cli.help.syntaxGuide'));
    console.log(t('cli.help.slideSeparation'));
    console.log(t('cli.help.frontMatter'));
    console.log(t('cli.help.availableCommands'));
    console.log(t('cli.help.availableStyles'));
    console.log(t('cli.help.animations'));
    console.log(t('cli.help.documentation'));
  });

program.parse();
