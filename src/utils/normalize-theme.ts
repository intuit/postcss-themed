import { produce, setAutoFreeze } from 'immer';
import type {
  PostcssThemeConfig,
  PostcssStrictThemeConfig,
  LightDarkTheme,
  SimpleTheme,
} from '../types';

setAutoFreeze(false);

type StrictThemeConfig = {
  light: SimpleTheme;
  dark: SimpleTheme;
};

const DEFAULT_THEME_CONFIG: StrictThemeConfig = {
  light: {},
  dark: {},
};

export function normalizeTheme(theme: PostcssThemeConfig) {
  const normalized: PostcssStrictThemeConfig = {};

  for (const [themeKey, themeConfig] of Object.entries(theme)) {
    const isStrictTheme = themeConfig?.light || themeConfig?.dark;

    const normalizedThemeConfig = produce(DEFAULT_THEME_CONFIG, (draft) => {
      if (themeConfig?.extends) {
        draft.light.extends = themeConfig.extends;
        draft.dark.extends = themeConfig.extends;
      }

      if (isStrictTheme) {
        draft.light = (themeConfig?.light ?? {}) as LightDarkTheme;
        draft.dark = (themeConfig?.dark ?? {}) as LightDarkTheme;
      }

      if (!isStrictTheme) {
        draft.light = themeConfig;
      }
    });

    normalized[themeKey] = normalizedThemeConfig;
  }

  return normalized;
}
