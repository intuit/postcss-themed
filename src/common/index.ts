import path from 'path';
import { PostcssThemeConfig, PostcssStrictThemeConfig, Theme } from "../types";

/** Get the theme variable name from a string */
export const parseThemeKey = (value: string) => {
  const key = value.match(/@theme \$?([a-zA-Z-_0-9]+)/);
  return key ? key[1] : '';
}

/** Replace a theme variable reference with a value */
export const replaceTheme = (value: string, replace: string) => {
  return value.replace(/@theme \$?([a-zA-Z-_0-9]+)/, replace);
}

/** Get the location of the theme file */
export function getThemeFilename(cssFile: string) {
  return path.join(path.dirname(cssFile), 'theme');
}

/** Remove :theme-root usage from a selector */
export const replaceThemeRoot = (selector: string) =>
  selector.replace(/:theme-root\((\S+)\)/g, '$1').replace(/:theme-root/g, '');

/** Make a SimpleTheme into a LightDarkTheme */
export const normalizeTheme = (config: PostcssThemeConfig | {}): PostcssStrictThemeConfig => {
  return Object.assign(
    {},
    ...Object.entries(config).map(([theme, themeConfig]) => {
      if ('light' in themeConfig && 'dark' in themeConfig) {
          return { [theme]: themeConfig };
      }

      return { [theme]: { light: themeConfig, dark: {} } };
    })
  );
};

/** Determine if a theme has dark mode enabled */
export const hasDarkMode = (theme: Theme) =>
  Boolean(
    Object.keys(theme.dark).length > 0 && Object.keys(theme.light).length > 0
  );

