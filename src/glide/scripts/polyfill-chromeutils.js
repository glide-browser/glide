/**
 * Simply adds `ChromeUtils.importESModule()` so that we can share the same
 * util code between firefox and node.js. This is only intended for util files
 * as other files are most likely side-effectful and assume firefox state.
 *
 * Note this only attempts to resolve imports for *our* own modules.
 *
 * This is also a pretty naive solution, a better setup would read from the obj
 * directory in some fashion to determine the mappings. TODO(glide): <<
 */

// @ts-check

// @ts-ignore
globalThis.ChromeUtils = {
  /**
   * @param {any} module_uri
   */
  importESModule(module_uri) {
    /** @type {keyof MockedExports.KnownModules} */
    const mod = module_uri;

    switch (mod) {
      case "chrome://glide/content/utils/dedent.mjs":
        return a_require("../browser/base/content/utils/dedent.mts");
      case "chrome://glide/content/utils/dom.mjs":
        return a_require("../browser/base/content/utils/dom.mts");
      case "chrome://glide/content/utils/html.mjs":
        return a_require("../browser/base/content/utils/html.mts");
      case "chrome://glide/content/utils/keys.mjs":
        return a_require("../browser/base/content/utils/keys.mts");
      case "chrome://glide/content/utils/args.mjs":
        return a_require("../browser/base/content/utils/args.mts");
      case "chrome://glide/content/utils/arrays.mjs":
        return a_require("../browser/base/content/utils/arrays.mts");
      case "chrome://glide/content/utils/guards.mjs":
        return a_require("../browser/base/content/utils/guards.mts");
      case "chrome://glide/content/utils/objects.mjs":
        return a_require("../browser/base/content/utils/guards.mts");
      case "chrome://glide/content/utils/strings.mjs":
        return a_require("../browser/base/content/utils/strings.mts");
      case "chrome://glide/content/utils/ipc.mjs":
        return a_require("../browser/base/content/utils/ipc.mts");

      case "chrome://glide/content/browser.mjs":
        return a_require("../browser/base/content/browser.mts");
      case "chrome://glide/content/motions.mjs":
        return a_require("../browser/base/content/motions.mts");
      case "chrome://glide/content/extensions.mjs":
        return a_require("../browser/base/content/extensions.mts");
      case "chrome://glide/content/browser-mode.mjs":
        return a_require("../browser/base/content/browser-mode.mts");
      case "chrome://glide/content/browser-dev.mjs":
        return a_require("../browser/base/content/browser-dev.mts");
      case "chrome://glide/content/text-objects.mjs":
        return a_require("../browser/base/content/text-objects.mts");
      case "chrome://glide/content/browser-excmds.mjs":
        return a_require("../browser/base/content/browser-excmds.mts");
      case "chrome://glide/content/browser-commands.mjs":
        return a_require("../browser/base/content/browser-commands.mts");
      case "chrome://glide/content/sandbox.mjs":
        return a_require("../browser/base/content/sandbox.mts");

      case "chrome://glide/content/hinting.mjs":
        return a_require("../browser/base/content/hinting.mts");
      case "chrome://glide/content/docs.mjs":
        return a_require("../browser/base/content/docs.mts");

      case "chrome://glide/content/bundled/shiki.mjs":
        return a_require("../bundled/shiki.mjs");
      case "chrome://glide/content/bundled/markdoc.mjs":
        return a_require("../bundled/markdoc.mjs");
      case "chrome://glide/content/bundled/ts-blank-space.mjs":
        return a_require("../bundled/ts-blank-space.mjs");
      case "chrome://glide/content/bundled/prettier.mjs":
        return a_require("../bundled/prettier.mjs");
      case "chrome://glide/content/bundled/prettier-html.mjs":
        return a_require("../bundled/prettier-html.mjs");

      case "resource://gre/modules/LayoutUtils.sys.mjs":
      case "resource://gre/modules/Timer.jsm":
      case "resource://gre/modules/Extension.sys.mjs":
      case "resource://gre/modules/ExtensionParent.sys.mjs":
      case "resource://gre/modules/ConduitsParent.sys.mjs":
      case "resource://gre/modules/ExtensionCommon.sys.mjs":
      case "resource://testing-common/GlideTestUtils.sys.mjs":
      case "resource://testing-common/DOMFullscreenTestUtils.sys.mjs":
        throw new Error(`cannot import ${mod} in non-firefox context`);

      default:
        throw check_never(mod);
    }
  },
};

/**
 * @type {typeof require}
 */
const a_require = require;

/**
 * @param {never} _x
 */
function check_never(_x) {}
