import { produce } from 'immer';
import merge from 'deepmerge';
import type { PostcssStrictThemeConfig, ColorScheme } from '../types';

export function resolveThemeExtends(theme: PostcssStrictThemeConfig) {
  const themeKeys = Object.keys(theme);

  const resolver = (themeKey: string, colorScheme: ColorScheme) => {
    return theme[themeKey][colorScheme]?.extends;
  };

  const resolvedTheme = produce(theme, (draft) => {
    for (const [themeKey, themeConfig] of Object.entries(theme)) {
      const schemes: ColorScheme[] = ['light', 'dark'];

      for (const scheme of schemes) {
        const schemeTheme = themeConfig[scheme];

        if (schemeTheme?.extends) {
          const chain: string[] = [schemeTheme.extends];
          let next: string | undefined = resolver(schemeTheme.extends, scheme);

          while (next) {
            if (next === themeKey) {
              throw new Error(
                `A theme cannot extend itself! '${themeKey}' extends '${next}'`,
              );
            }

            if (!themeKeys.includes(next)) {
              throw new Error(`Theme to extend from not found! '${next}'`);
            }

            if (chain.includes(next)) {
              chain.push(next);
              throw new Error(
                `Circular theme extension found! ${chain
                  .map((i) => `'${i}'`)
                  .join(' => ')}`,
              );
            }

            chain.push(next);
            next = resolver(next, scheme);
          }

          const chainThemes = chain.reverse().map((key) => theme[key][scheme]);
          const mergedTheme = merge.all([...chainThemes, themeConfig[scheme]]);
          draft[themeKey][scheme] = mergedTheme;
          delete draft[themeKey][scheme].extends;
        }
      }
    }
  });

  return resolvedTheme;
}
