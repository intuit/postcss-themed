import localizeIdentifier from '../src/localize-identifier';

it('should not do anything to identifier', () => {
  expect(
    localizeIdentifier(
      { resourcePath: '/app/foo.css' },
      '[local]',
      'background'
    )
  ).toBe('background');
});

it('should add file name', () => {
  expect(
    localizeIdentifier(
      { resourcePath: '/app/foo.css' },
      '[name]-[local]',
      'background'
    )
  ).toBe('foo-background');
});

it('should hash', () => {
  expect(
    localizeIdentifier(
      { resourcePath: '/app/foo.css' },
      '[hash:base64:7]',
      'background'
    )
  ).toBe('JAUIJsV');
});

it('should use folder', () => {
  expect(
    localizeIdentifier(
      { resourcePath: '/app/foo.css' },
      '[folder]-[name]-[local]',
      'background'
    )
  ).toBe('app-foo-background');
});
