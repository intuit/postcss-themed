import { Helpers } from 'postcss';

const THEME_USAGE_REGEX = /@theme\s+\$?([a-zA-Z-_0-9.]+)/;
const CSS_VARIABLE_REGEX = /var\(--([a-zA-Z-_0-9.]+),\s([a-zA-Z-_0-9.]+)\)/;

/**
 * Get the value for @theme
 */
export function parseThemeKey(value: string) {
  const key = value.match(THEME_USAGE_REGEX);

  if (key) {
    return key[1];
  }

  return 'here';
}

/**
 * Parse a CSS variable with a default value
 */
export function parseCssVariable(value: string) {
  const keys = value.match(CSS_VARIABLE_REGEX);

  if (keys) {
    return keys[1];
  }

  return '';
}

/**
 * Replace a @theme with the provided string
 */
export function replaceTheme(value: string, replace: string) {
  return value.replace(THEME_USAGE_REGEX, replace);
}

/**
 * Replace a var(--key, value) with the provided string
 */
export function replaceCssVariable(value: string, replace: string) {
  return value.replace(CSS_VARIABLE_REGEX, replace);
}

export function createCssVariable(
  helpers: Helpers,
  key: string,
  value: string,
) {
  return new helpers.Declaration({
    prop: `--${key}`,
    value: `${value}`,
  });
}
