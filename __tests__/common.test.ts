import { resolveThemeExtension, normalizeTheme } from '../src/common';

it('should be able to extend a simple theme', () => {
  expect(
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red',
        },
        myTheme: {
          color: 'blue',
        },
        myChildTheme: {
          extends: 'myTheme',
        },
      })
    )
  ).toStrictEqual({
    default: {
      light: { color: 'red' },
      dark: {},
    },
    myTheme: {
      light: { color: 'blue' },
      dark: {},
    },
    myChildTheme: {
      light: { color: 'blue' },
      dark: {},
    },
  });
});

it('should be able to extend a simple theme', () => {
  expect(
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red',
        },
        myTheme: {
          light: { color: 'blue' },
          dark: { color: 'green' },
        },
        myChildTheme: {
          extends: 'myTheme',
        },
      })
    )
  ).toStrictEqual({
    default: {
      light: { color: 'red' },
      dark: {},
    },
    myTheme: {
      light: { color: 'blue' },
      dark: { color: 'green' },
    },
    myChildTheme: {
      light: { color: 'blue' },
      dark: { color: 'green' },
    },
  });
});

it('should be able to extend a dark/light theme from root', () => {
  expect(
    resolveThemeExtension({
      default: {
        light: { color: 'white' },
        dark: { color: 'black' },
      },
      myTheme: {
        light: { color: 'blue' },
        dark: { color: 'red' },
      },
      myChildTheme: {
        extends: 'myTheme',
        light: {},
        dark: {},
      },
    })
  ).toStrictEqual({
    default: {
      light: { color: 'white' },
      dark: { color: 'black' },
    },
    myTheme: {
      light: { color: 'blue' },
      dark: { color: 'red' },
    },
    myChildTheme: {
      light: { color: 'blue' },
      dark: { color: 'red' },
    },
  });
});

it('should be able to extend a theme that extends another theme', () => {
  expect(
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red',
        },
        myTheme: {
          color: 'blue',
        },
        myChildTheme: {
          extends: 'myTheme',
        },
        myOtherChildTheme: {
          extends: 'myChildTheme',
        },
      })
    )
  ).toStrictEqual({
    default: {
      light: { color: 'red' },
      dark: {},
    },
    myTheme: {
      light: { color: 'blue' },
      dark: {},
    },
    myChildTheme: {
      light: { color: 'blue' },
      dark: {},
    },
    myOtherChildTheme: {
      light: { color: 'blue' },
      dark: {},
    },
  });
});

it('should add the light extras if there is an extension in the light theme', () => {
  expect(
    resolveThemeExtension({
      default: {
        light: { color: 'white' },
        dark: { color: 'black' },
      },
      myTheme: {
        light: { color: 'blue' },
        dark: {},
      },
      myChildTheme: {
        light: { extends: 'myTheme' },
        dark: {},
      },
    })
  ).toStrictEqual({
    default: {
      light: { color: 'white' },
      dark: { color: 'black' },
    },
    myChildTheme: {
      dark: {},
      light: { color: 'blue' },
    },
    myTheme: {
      dark: {},
      light: { color: 'blue' },
    }
  });
});

it('should add dark extras if there is an extension in the dark theme', () => {
  expect(
    resolveThemeExtension({
      default: {
        light: { color: 'white' },
        dark: { color: 'black' },
      },
      myTheme: {
        light: {},
        dark: {color: 'blue'},
      },
      myChildTheme: {
        light: {},
        dark: {extends: 'myTheme'}
      },
    })
  ).toStrictEqual({
    default: {
      light: { color: 'white' },
      dark: { color: 'black' },
    },
    myChildTheme: {
      light: {},
      dark: { color: 'blue' },
    },
    myTheme: {
      light: {},
      dark: { color: 'blue' },
    }
  });
});

it('should be able to resolve color scheme theme correctly if there is a chain in the extension ', () => {
  expect(
    resolveThemeExtension({
      default: {
        light: { color: 'white' },
        dark: {},
      },
      myTheme: {
        light: {},
        dark: {color: 'pink', extends: 'myOtherTheme'},
      },
      myOtherTheme: {
        light: { color: 'blue'},
        dark: {color: 'red', extends: 'yetAnotherTheme'},
      },
      yetAnotherTheme: {
        light: { color: 'red'},
        dark: { color: 'red'}
      }
    })
  ).toStrictEqual({
    default: {
      light: { color: 'white' },
      dark: {},
    },
    myTheme: {
      light: {},
      dark: { color: 'pink' }
    },
    myOtherTheme: {
      light: { color: 'blue'},
      dark: { color: 'red'}
    },
    yetAnotherTheme: {
      light: { color: 'red' },
      dark: { color: 'red' }
    }
  });
});

it('should be able to extend a theme that extends another theme - out of order', () => {
  expect(
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red',
        },
        myTheme: {
          color: 'blue',
        },
        myOtherChildTheme: {
          extends: 'myChildTheme',
        },
        myChildTheme: {
          extends: 'myTheme',
        },
      })
    )
  ).toStrictEqual({
    default: {
      light: { color: 'red' },
      dark: {},
    },
    myTheme: {
      light: { color: 'blue' },
      dark: {},
    },
    myChildTheme: {
      light: { color: 'blue' },
      dark: {},
    },
    myOtherChildTheme: {
      light: { color: 'blue' },
      dark: {},
    },
  });
});



it('should error on unknown themes', () => {
  expect(() =>
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red',
        },
        myTheme: {
          color: 'blue',
        },
        myChildTheme: {
          extends: 'myThemes',
        },
      })
    )
  ).toThrow("Theme to extend from not found! 'myThemes'");
});

it('should error when extending itself', () => {
  expect(() =>
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red',
        },
        myTheme: {
          extends: 'myTheme',
        },
      })
    )
  ).toThrow("A theme cannot extend itself! 'myTheme' extends 'myTheme'");
});

it('should error when cycles detected', () => {
  expect(() =>
    resolveThemeExtension({
      default: {
        light: { color: 'white' },
        dark: { color: 'black' },
      },
      myTheme: {
        extends: 'myChildTheme',
        light: { color: 'blue' },
        dark: {},
      },
      myChildTheme: {
        extends: 'myTheme',
        light: {},
        dark: {},
      },
    })
  ).toThrow(
    "Circular theme extension found! 'myTheme' => 'myChildTheme' => 'myTheme'"
  );
});

it('should error when cycles detected - subthemes', () => {
  expect(() =>
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red',
        },
        myTheme: {
          extends: 'myChildTheme',
        },
        myChildTheme: {
          extends: 'myTheme',
        },
      })
    )
  ).toThrow(
    "Circular theme extension found! 'myTheme' => 'myChildTheme' => 'myTheme'"
  );
});

it('should error when cycles detected - complicated', () => {
  expect(() =>
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red',
        },
        one: {
          extends: 'five',
        },
        two: {
          extends: 'one',
        },
        three: {
          extends: 'two',
        },
        four: {
          extends: 'three',
        },
        five: {
          extends: 'four',
        },
      })
    )
  ).toThrow(
    "Circular theme extension found! 'one' => 'five' => 'four' => 'three' => 'two' => 'one'"
  );
});
