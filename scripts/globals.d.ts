/**
 * Set at runtime by `./polyfill-chromeutils.cjs`.
 */
declare var ChromeUtils: {
  importESModule(module_uri: string): any;
};
