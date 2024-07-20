import merge from 'deepmerge';
import type { Result } from 'postcss';
import { normalizeTheme } from './normalize-theme';
import { loadComponentConfig } from './load-component-config';
import { resolveThemeExtends } from './resolve-theme-extends';
import type { PostcssThemeOptions } from '../types';

export async function createThemeConfigs(
  options: PostcssThemeOptions,
  result: Result,
) {
  const { config } = options;

  if (options.defaultTheme && !(options.defaultTheme in config)) {
    throw new Error(
      `Could not find theme ${options.defaultTheme} in theme configuration set in defaultTheme.`,
    );
  }

  if (options.forceSingleTheme && !(options.forceSingleTheme in config)) {
    throw new Error(
      `Could not find theme ${options.forceSingleTheme} in theme configuration set in forceSingleTheme.`,
    );
  }

  const globalConfig = normalizeTheme(config);
  const componentConfig = await loadComponentConfig(
    globalConfig,
    result.opts.from,
    options.resolveTheme,
  );
  const mergedGlobalConfig = merge(
    globalConfig,
    normalizeTheme(componentConfig),
  );

  const resolvedTheme = resolveThemeExtends(mergedGlobalConfig);
  const defaultTheme = resolvedTheme[options.defaultTheme];
  const singleTheme = options.forceSingleTheme
    ? merge(defaultTheme, resolvedTheme[options.forceSingleTheme])
    : undefined;

  return {
    theme: resolvedTheme,
    baseTheme: singleTheme ?? defaultTheme,
  };
}
