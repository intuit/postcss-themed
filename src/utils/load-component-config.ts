import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import * as esbuild from 'esbuild';

import type { PostcssThemeConfig, ThemeResolver } from '../types';

const CONFIG_FILES = [
  'theme.js',
  'theme.mjs',
  'theme.ts',
  'theme.cjs',
  'theme.mts',
  'theme.cts',
] as const;

export function getThemeFilename(cssPath?: string) {
  if (!cssPath) {
    return;
  }

  const rootPath = path.dirname(cssPath);

  let resolvedPath: string | undefined;

  for (const filename of CONFIG_FILES) {
    const filepath = path.resolve(rootPath, filename);

    if (!fs.existsSync(filepath)) {
      continue;
    }

    resolvedPath = filepath;
    break;
  }

  if (resolvedPath) {
    return resolvedPath;
  }
}

export async function loadComponentConfig(
  rootTheme: PostcssThemeConfig,
  cssPath?: string,
  resolveTheme?: ThemeResolver,
) {
  if (!cssPath) {
    return {};
  }

  const rootPath = path.dirname(cssPath);
  let resolvedConfig;

  if (resolveTheme) {
    resolvedConfig = resolveTheme(cssPath);
  } else {
    let resolvedPath: string | undefined;

    for (const filename of CONFIG_FILES) {
      const filepath = path.resolve(rootPath, filename);

      if (!fs.existsSync(filepath)) {
        continue;
      }

      resolvedPath = filepath;
      break;
    }

    if (!resolvedPath) {
      return {};
    }

    const result = await esbuild.build({
      entryPoints: [resolvedPath],
      bundle: true,
      write: false,
      platform: 'node',
      format: 'esm',
    });

    const tmpFilepath = `theme-config-${performance.now()}.mjs`;
    const tmpFolderpath = fs.mkdtempSync(path.join(tmpdir(), 'postcss-themed'));
    const tmpPath = path.join(tmpFolderpath, tmpFilepath);

    fs.writeFileSync(tmpPath, result.outputFiles[0]!.text, {
      encoding: 'utf8',
    });

    try {
      const imported = await import(tmpPath);
      resolvedConfig = imported.default;
    } finally {
      fs.rmSync(tmpPath, { recursive: true });
    }
  }

  const config =
    typeof resolvedConfig === 'function'
      ? resolvedConfig(rootTheme)
      : resolvedConfig;

  return config;
}
