import postcss from 'postcss';

import plugin from '../src/index';
import { run } from './test-utils';

it('Creates theme override', () => {
  const config = {
    default: {
      color: 'purple',
    },
    dark: {
      color: 'black',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
        background-image: linear-gradient(to right, @theme color, @theme color)
      }
    `,
    `
      .test {
        color: purple;
        background-image: linear-gradient(to right, purple, purple)
      }
      .dark .test {
        color: black;
        background-image: linear-gradient(to right, black, black)
      }
    `,
    {
      config,
    }
  );
});

it('Creates multiple theme overrides', () => {
  const config = {
    default: {
      color: 'purple',
    },
    light: {
      color: 'white',
    },
    dark: {
      color: 'black',
    },
    happy: {
      color: 'green',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: purple;
      }
      .light .test {
        color: white;
      }
      .dark .test {
        color: black;
      }
      .happy .test {
        color: green;
      }
    `,
    {
      config,
    }
  );
});

it('Only overrides what it needs to', () => {
  const config = {
    default: {
      color: 'purple',
    },
    light: {
      color: 'white',
    },
  };

  return run(
    `
      .test {
        font-size: 20px;
        color: @theme color;
        display: flex;
      }
    `,
    `
      .test {
        font-size: 20px;
        color: purple;
        display: flex;
      }
      .light .test {
        color: white;
      }
    `,
    {
      config,
    }
  );
});

it('replaces partial values', () => {
  const config = {
    default: {
      color: 'purple',
    },
    light: {
      color: 'white',
    },
  };

  return run(
    `
      .test {
        border: 1px solid @theme color;
      }
    `,
    `
      .test {
        border: 1px solid purple;
      }
      .light .test {
        border: 1px solid white;
      }
    `,
    {
      config,
    }
  );
});

it('finds javascript themes', () => {
  const config = {
    default: {},
    light: {
      background: 'red',
    },
  };

  return run(
    `
      .test {
        background: @theme background;
      }
    `,
    `
      .test {
      }
      .light .test {
        background: yellow;
      }
    `,
    {
      config,
    },
    './__tests__/test-component-themes-js/test.css'
  );
});

it('finds typescript themes', () => {
  const config = {
    default: {},
    light: {
      background: 'red',
    },
  };

  return run(
    `
      .test {
        background: @theme background;
      }
    `,
    `
      .test {
      }
      .light .test {
        background: yellow;
      }
    `,
    {
      config,
    },
    './__tests__/test-component-themes-ts/test.css'
  );
});

it('custom theme resolver', () => {
  const config = {
    default: {},
    light: {
      background: 'red',
    },
  };

  return run(
    `
      .test {
        background: @theme background;
      }
    `,
    `
      .test {
      }
      .light .test {
        background: yellow;
      }
    `,
    {
      config,
      resolveTheme: () =>
        // eslint-disable-next-line global-require, node/no-missing-require
        require('./test-component-themes-ts/theme'),
    },
    './test.css'
  );
});

it('works when no theme found', () => {
  const config = {
    default: {},
    light: {
      background: 'red',
    },
  };

  return run(
    `
      .test {
        background: @theme background;
      }
    `,
    `
      .test {
      }
      .light .test {
        background: red;
      }
    `,
    {
      config,
    },
    './__tests__/test.css'
  );
});

it('omits undefined values', () => {
  const config = {
    default: {
      background: 'blue',
    },
    light: {
      color: 'white',
    },
  };

  return run(
    `
      .test {
        background: @theme background;
        color: @theme color;
      }
    `,
    `
      .test {
        background: blue;
      }
      .light .test {
        color: white;
      }
    `,
    {
      config,
    }
  );
});

it('process :theme-root', () => {
  const config = {
    default: {
      color: 'purple',
    },
    light: {
      color: 'white',
    },
  };

  return run(
    `
      :theme-root(*) {
        color: @theme color;
      }
    `,
    `
      * {
        color: purple;
      }
      *.light {
        color: white;
      }
    `,
    {
      config,
    }
  );
});

it('process :theme-root - nested', () => {
  const config = {
    default: {
      color: 'purple',
    },
    light: {
      color: 'white',
    },
  };

  return run(
    `
      :theme-root {
        &.test {
          color: @theme color;
        }

        .another {
          color: @theme color;
        }
      }
    `,
    `
      .test {
        color: purple;
      }
      .another {
        color: purple;
      }
      .light.test {
        color: white;
      }
      .light .another {
        color: white;
      }
    `,
    {
      config,
    }
  );
});

it('multiple values in one declaration', () => {
  const config = {
    default: {
      color: 'purple',
      width: '1px',
    },
    light: {
      color: 'white',
      width: '10px',
    },
  };

  return run(
    `
      .test {
        border: @theme width solid @theme color;
      }
    `,
    `
      .test {
        border: 1px solid purple;
      }
      .light .test {
        border: 10px solid white;
      }
    `,
    {
      config,
    }
  );
});

it('Requires a config', () => {
  return postcss([plugin()])
    .process('', { from: undefined })
    .catch((e) => {
      expect(e).toEqual(new Error('No config provided to postcss-themed'));
    });
});

it('Finds missing keys', () => {
  const input = `
    .test {
      color: @theme color;
    }
  `;
  const config = {
    default: {
      color: 'purple',
    },
    dark: {
      'background-color': 'black',
    },
  };

  return postcss([plugin({ config })])
    .process(input, { from: undefined })
    .catch((e) => {
      expect(e.message).toContain("Theme 'dark' does not contain key 'color'");
    });
});

it('Finds missing default', () => {
  const input = `
    .test {
      color: @theme color;
    }
  `;
  const config = {
    light: {
      color: 'purple',
    },
    dark: {
      'background-color': 'black',
    },
  };

  // @ts-ignore
  return postcss([plugin({ config })])
    .process(input, { from: undefined })
    .catch((e) => {
      expect(e.message).toContain(
        "Theme 'default' does not contain key 'color'"
      );
    });
});

it('multiple themes + theme-root', () => {
  const config = {
    default: {
      color: 'purple',
      width: '1px',
    },
    light: {
      color: 'white',
      width: '10px',
    },
    dark: {
      color: 'black',
      width: '100px',
    },
  };

  return run(
    `
      :theme-root {
        &.expanded {
          width: @theme width;
        }
      }
    `,
    `
      .expanded {
        width: 1px;
      }
      .light.expanded {
        width: 10px;
      }
      .dark.expanded {
        width: 100px;
      }
    `,
    {
      config,
    }
  );
});

it('multiple themes + fallback', () => {
  const config = {
    default: {
      color: 'purple',
      width: '1px',
    },
    light: {
      color: 'white',
    },
    dark: {
      color: 'black',
    },
  };

  return run(
    `
      :theme-root {
        &.expanded {
          border: @theme width solid @theme color;
        }
      }
    `,
    `
      .expanded {
        border: 1px solid purple;
      }
      .light.expanded {
        border: 1px solid white;
      }
      .dark.expanded {
        border: 1px solid black;
      }
    `,
    {
      config,
    }
  );
});

it('non-default main theme', () => {
  const config = {
    newDefault: {
      color: 'black',
    },
    shinyNewProduct: {
      color: 'red',
      width: '1rem',
    },
  };

  return run(
    `
    .test {
      background-color: @theme color;
      width: @theme width;
    }
  `,
    `
    .test {
      background-color: black;
    }

    .shinyNewProduct .test {
      background-color: red;
      width: 1rem;
    }`,
    { config, defaultTheme: 'newDefault' }
  );
});

it('non-existent default theme', () => {
  const config = {
    newDefault: {
      color: 'black',
    },
    shinyNewProduct: {
      color: 'red',
      width: '1rem',
    },
  };

  const input = `
  .test {
    background-color: @theme color;
    width: @theme width;
  }
`;

  // @ts-ignore
  return postcss([plugin({ config, defaultTheme: 'otherDefaultTheme' })])
    .process(input, { from: undefined })
    .catch((e) => {
      expect(e.message).toContain(
        "Theme 'otherDefaultTheme' does not contain key 'color'"
      );
    });
});

it('multiple selectors', () => {
  const config = {
    default: {
      color: 'purple',
      width: '1px',
    },
    light: {
      color: 'white',
      width: '10px',
    },
  };

  return run(
    `
      .expanded, .foo {
        width: @theme width;
      }
    `,
    `
      .expanded, .foo {
        width: 1px;
      }
      .light .expanded,.light  .foo {
        width: 10px;
      }
    `,
    {
      config,
    }
  );
});

it('multiple selectors - theme root', () => {
  const config = {
    default: {
      color: 'purple',
      width: '1px',
    },
    light: {
      color: 'white',
      width: '10px',
    },
    mint: {},
  };

  return run(
    `
    .item {
      display: flex;

      &:focus,
      &:hover {
        background: @theme color;
        width: @theme width;
      }
    }
    `,
    `
      .item {
        display: flex;
      }
      .item:focus,.item:hover {
        background: purple;
        width: 1px;
      }
      .light .item:focus,.light       .item:hover {
        background: white;
        width: 10px;
      }
    `,
    {
      config,
    }
  );
});

it('dark themes', () => {
  const config = {
    default: {
      light: {
        color: 'white',
      },
      dark: {
        color: 'black',
      },
    },
    mint: {
      light: {
        color: 'lightblue',
      },
      dark: {
        color: 'darkblue',
      },
    },
    tto: {
      color: 'red',
    },
  };

  return run(
    `
      .item {
        color: @theme color;
      }
    `,
    `
      .item {
        color: white;
      }
      .dark .item {
        color: black;
      }
      .mint .item {
        color: lightblue;
      }
      .mint.dark .item {
        color: darkblue;
      }
      .tto .item {
        color: red;
      }
    `,
    {
      config,
    }
  );
});

it('overrides themes to single theme', () => {
  const config = {
    newDefault: {
      color: 'black',
    },
    shinyNewProduct: {
      color: 'red',
      width: '1rem',
    },
  };

  const input = `
  .test {
    background-color: @theme color;
    width: @theme width;
  }
  `;

  return postcss([
    plugin({ config, defaultTheme: 'quickBooks', forceSingleTheme: 'true' }),
  ])
    .process(input, { from: undefined })
    .catch((e) => {
      expect(e.message).toContain(
        "Theme 'quickBooks' does not contain key 'color'"
      );
    });
});

it('when theme = light , forceSingleTheme = true, single selector is generated', () => {
  const config = {
    default: {
      color: 'purple',
      width: '1px',
    },
    light: {
      color: 'white',
      width: '10px',
    },
    dark: {
      color: 'black',
      width: '20px',
    },
  };

  return run(
    `
      .expanded, .foo {
        color: @theme color;
        width: @theme width;
      }
    `,
    `
      .expanded, .foo {
        color: white;
        width: 10px;
      }
    `,
    {
      config,
      defaultTheme: 'light',
      forceSingleTheme: 'true',
    }
  );
});

it('when theme = light , forceSingleTheme = false, multiple selectors are generated', () => {
  const config = {
    default: {
      color: 'purple',
      width: '1px',
    },
    light: {
      color: 'white',
      width: '10px',
    },
    dark: {
      color: 'black',
      width: '20px',
    },
  };

  return run(
    `
      .expanded, .foo {
        width: @theme width;
        color: @theme color;
      }
    `,
    `
      .expanded, .foo {
        width: 10px;
        color: white;
      }
    `,
    {
      config,
      defaultTheme: 'light',
      forceSingleTheme: 'false',
    }
  );
});

it('Adding empty selectors to final output. Part of legacy code', () => {
  const config = {
    default: {
      color: 'purple',
    },
    light: {
      color: 'white',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: purple;
      }
      .light .test {
        color: white;
      }
      .default {}
      .light {}
      .dark {}
    `,
    {
      config,
      forceEmptyThemeSelectors: true,
    }
  );
});
