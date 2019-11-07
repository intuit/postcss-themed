import cssesc from 'cssesc';
import loaderUtils from 'loader-utils';
import { loader } from 'webpack';

// eslint-disable-next-line no-control-regex
const filenameReservedRegex = /[<>:"/\\|?*\x00-\x1F]/g;
// eslint-disable-next-line no-control-regex
const reControlChars = /[\u0000-\u001f\u0080-\u009f]/g;
const reRelativePath = /^\.+/;

export default function localizeIdentifier(
  loaderContext: Partial<loader.LoaderContext>,
  localIdentName: string,
  name: string
) {
  return cssesc(
    loaderUtils
      .interpolateName(
        loaderContext as Required<loader.LoaderContext>,
        localIdentName,
        { content: name }
      ) // For `[hash]` placeholder
      .replace(/^((-?[0-9])|--)/, '_$1')
      .replace(filenameReservedRegex, '-')
      .replace(reControlChars, '-')
      .replace(reRelativePath, '-')
      .replace(/\./g, '-')
  ).replace(/\[local\]/gi, name);
}
