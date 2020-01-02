import { run } from './test-utils';

jest.mock('browserslist', () => () => ['chrome 76']);

it('Creates a simple css variable based theme', () => {
  const config = {
    default: {
      color: 'purple',
      extras: 'black'
    },
    mint: {
      color: 'teal'
    }
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
        color: var(--color);
        background-image: linear-gradient(to right, var(--color), var(--color))
      }

      :root {
        --color: purple
      }

      .mint {
        --color: teal
      }
    `,
    {
      config
    }
  );
});

it('Creates a simple css variable based theme with light and dark', () => {
  const config = {
    default: {
      light: {
        color: 'purple'
      },
      dark: {
        color: 'black'
      }
    },
    mint: {
      color: 'teal'
    },
    chair: {
      light: {
        color: 'beige'
      },
      dark: {
        color: 'darkpurple'
      }
    }
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
        color: var(--color);
        background-image: linear-gradient(to right, var(--color), var(--color))
      }

      :root {
        --color: purple
      }

      .dark {
        --color: black
      }

      .mint {
        --color: teal
      }

      .chair.light {
        --color: beige
      }

      .chair.dark {
        --color: darkpurple
      }
    `,
    {
      config
    }
  );
});

it('works with nested', () => {
  const config = {
    default: {
      color: 'purple'
    },
    light: {
      color: 'white'
    }
  };

  return run(
    `
      .foo {
        &.test {
          color: @theme color;
        }

        .another {
          color: @theme color;
        }
      }
    `,
    `
      .foo.test {
        color: var(--color);
      }

      .foo .another {
        color: var(--color);
      }

      :root {
        --color: purple;
      }

      .light {
        --color: white;
      }
    `,
    {
      config
    }
  );
});

it('scoped variable names', () => {
  const config = {
    default: {
      color: 'purple'
    },
    light: {
      color: 'white'
    }
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
        color: var(--app-foo-color);
        background-image: linear-gradient(to right, var(--app-foo-color), var(--app-foo-color))
      }

      :root {
        --app-foo-color: purple
      }

      .light {
        --app-foo-color: white
      }
    `,
    {
      config,
      modules: '[folder]-[name]-[local]'
    },
    '/app/foo.css'
  );
});
