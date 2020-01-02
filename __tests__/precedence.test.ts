import { run } from './test-utils';

jest.mock('browserslist', () => () => ['chrome 76']);

it('Overrides all themes from default', () => {
  const config = {
    default: {
      light: {
        color: 'red'
      },
      dark: {
        color: 'blue'
      }
    },
    mint: {
      color: 'teal'
    }
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: var(--color);
      }

      :root {
        --color: red;
      }
      
      .dark {
        --color: blue;
      }

      .mint {
        --color: teal;
      }
    `,
    {
      config
    }
  );
});

it('Overrides dark themes from default', () => {
  const config = {
    default: {
      light: {
        color: 'red'
      },
      dark: {
        color: 'blue'
      }
    },
    mint: {
      light: {
        color: 'purple'
      },
      dark: {
        color: 'teal'
      }
    }
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: var(--color);
      }

      :root {
        --color: red;
      }
      
      .dark {
        --color: blue;
      }

      .mint.light {
        --color: purple;
      }

      .mint.dark {
        --color: teal;
      }
    `,
    {
      config
    }
  );
});
