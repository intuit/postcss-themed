import type { Helpers, Root } from 'postcss';
import get from 'dlv';
import type {
  LightDarkTheme,
  PostcssStrictThemeConfig,
  PostcssThemeOptions,
} from '../types';
import { createCssVariable } from './declaration-utils';

export function generateThemeCss({
  baseTheme,
  alternateThemes,
  variableNames,
  root,
  helpers,
  options,
  localize,
}: {
  baseTheme: LightDarkTheme;
  alternateThemes: PostcssStrictThemeConfig;
  variableNames: Map<string, string>;
  root: Root;
  helpers: Helpers;
  options: PostcssThemeOptions;
  localize: (name: string) => string;
}) {
  for (const [themeName, themeObject] of Object.entries(alternateThemes)) {
    const baseSelector = new helpers.Rule({
      selector: `.${themeName}`,
    });

    const lightSelector = new helpers.Rule({
      selector: `.${themeName}${options.lightClass}`,
    });

    const darkSelector = new helpers.Rule({
      selector: `.${themeName}${options.darkClass}`,
    });

    for (const key of variableNames.values()) {
      const themeValueLight = get(themeObject.light, key);
      const themeValueDark = get(themeObject.dark, key);
      const baseThemeValueLight = get(baseTheme.light, key);
      const baseThemeValueDark = get(baseTheme.dark, key);
      const variableName = localize(key);

      if (
        typeof themeValueLight === 'string' &&
        themeValueLight !== baseThemeValueLight
      ) {
        lightSelector.append(
          createCssVariable(helpers, variableName, themeValueLight),
        );
      }

      if (
        typeof themeValueDark === 'string' &&
        themeValueDark !== baseThemeValueDark
      ) {
        darkSelector.append(
          createCssVariable(helpers, variableName, themeValueDark),
        );
      }
    }

    for (const sel of [baseSelector, lightSelector, darkSelector]) {
      if (sel.nodes.length > 0) {
        root.append(sel);
      }
    }
  }
}
