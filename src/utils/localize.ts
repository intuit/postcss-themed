import crypto from 'node:crypto';
import { Result } from 'postcss';
import cssesc from 'cssesc';
import loaderUtils from 'loader-utils';
import type { loader } from 'webpack';
import { PostcssThemeOptions } from '../types';

// eslint-disable-next-line no-control-regex
const filenameReservedRegex = /[<>:"/\\|?*\x00-\x1F]/g;
// eslint-disable-next-line no-control-regex
const reControlChars = /[\u0000-\u001f\u0080-\u009f]/g;
const reRelativePath = /^\.+/;

function localizeIdentifier(
  loaderContext: Partial<loader.LoaderContext>,
  localIdentName: string,
  name: string,
) {
  return cssesc(
    loaderUtils
      .interpolateName(
        loaderContext as Required<loader.LoaderContext>,
        localIdentName,
        { content: name },
      ) // For `[hash]` placeholder
      .replace(/^((-?\d)|--)/, '_$1')
      .replace(filenameReservedRegex, '-')
      .replace(reControlChars, '-')
      .replace(reRelativePath, '-')
      .replace(/\./g, '-'),
  ).replace(/\[local\]/gi, name);
}

function cleanupName(name: string) {
  return name.replace(/\./g, '-');
}

export function createLocalizer(
  modules: PostcssThemeOptions['modules'],
  result: Result,
) {
  const fromPath = result.root.source?.input.from ?? '';
  const fileContents = result.root.source?.input.css ?? '';
  const filePath = fromPath.startsWith('<') ? 'default' : fromPath;

  if (typeof modules === 'function') {
    return (name: string) => {
      return modules(cleanupName(name), filePath, fileContents);
    };
  } else if (modules === 'default') {
    return (name: string) => {
      const hash = crypto
        .createHash('md5')
        .update(fileContents)
        .digest('hex')
        .slice(0, 6);
      return `${filePath || 'default'}-${cleanupName(name)}-${hash}`;
    };
  }

  return (name: string) => {
    return localizeIdentifier(
      { resourcePath: filePath },
      modules ?? '[local]',
      cleanupName(name),
    );
  };
}
