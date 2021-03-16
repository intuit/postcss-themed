export interface ThemeObject {
  [key: string]: string | ThemeObject;
}
export type SimpleTheme = Omit<ThemeObject, 'extends'> & {
  extends?: string;
};
export type ColorScheme = 'light' | 'dark';
export type LightDarkTheme = Record<ColorScheme, SimpleTheme> & {
  extends?: string;
};
export type Theme = SimpleTheme | LightDarkTheme;

export interface Config<T> {
  [theme: string]: T;
}

export type PostcssThemeConfig = Config<Theme>;
export type PostcssStrictThemeConfig = Config<LightDarkTheme>;

export type ComponentTheme = (theme: PostcssThemeConfig) => PostcssThemeConfig;
export type ThemeResolver = (path: string) => ComponentTheme;

export type ScopedNameFunction = (
  name: string,
  filename: string,
  css: string
) => string;

export interface PostcssThemeOptions {
  /** Configuration given to the postcss plugin */
  config?: PostcssThemeConfig;
  /** A function to resolve the theme file */
  resolveTheme?: ThemeResolver;
  /** LEGACY - Put empty selectors in final output */
  forceEmptyThemeSelectors?: boolean;
  /** The name of the default theme */
  defaultTheme?: string;
  /** Attempt to substitute only a single theme */
  forceSingleTheme?: string;
  /** Remove CSS Variables when possible */
  optimizeSingleTheme?: boolean;
  /** Whether to include custom variable default values. Defaults to true. */
  inlineRootThemeVariables?: boolean;
  /** Transform CSS variable names similar to CSS-Modules */
  modules?: string | ScopedNameFunction;
}
