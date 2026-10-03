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
    TabsBase: typeof TabsBase;
  }>;

  class MozXULElement extends XULElement implements MozElementBase {
    static implementCustomInterface(cls: MozElementBase, ifaces: nsIID[]): void;
  }
  class MozHTMLElement extends HTMLElement implements MozElementBase {
    static implementCustomInterface(cls: MozElementBase, ifaces: nsIID[]): void;
  }

  // toolkit/content/widgets/tabbox.js, with MozElements.BaseControl's two
  // members folded in. Carries the members consumers of a <tabs> subclass
  // reach; add one when it becomes an error.
  class TabsBase extends MozXULElement {
    disabled: boolean;
    tabIndex: number;
    selectedIndex: number;
    // TODO(bug 2071355): take and return MozElements.MozTab once it is
    // declared. The type parameter stands in for it, carrying a call site's
    // own tab type into `filter` and the return value.
    findNextTab<T extends Element>(
      startTab: T,
      opts?: {
        direction?: number;
        wrap?: boolean;
        startWithAdjacent?: boolean;
        filter?: (tab: T) => boolean;
      }
    ): T | null;
  }

  type MozBrowser =
    import("../../toolkit/content/widgets/browser-custom-element.mjs").MozBrowser;
}
