/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
export {};

interface MozElementBase {
  new (): Element;
}

declare global {
  const MozElements: Readonly<{
    MozElementMixin<T extends MozElementBase>(base: T): T;
  }>;

  class MozXULElement extends XULElement implements MozElementBase {
    static implementCustomInterface(cls: MozElementBase, ifaces: nsIID[]): void;
  }
  class MozHTMLElement extends HTMLElement implements MozElementBase {
    static implementCustomInterface(cls: MozElementBase, ifaces: nsIID[]): void;
  }

  type MozBrowser =
    import("../../toolkit/content/widgets/browser-custom-element.mjs").MozBrowser;
}
