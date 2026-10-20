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
    MozTab: typeof MozTab;
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
    // Generic so that `filter` receives, and the method returns, the same tab
    // type as the call site's `startTab`.
    findNextTab<T extends MozTab>(
      startTab: T,
      opts?: {
        direction?: number;
        wrap?: boolean;
        startWithAdjacent?: boolean;
        filter?: (tab: T) => boolean;
      }
    ): T | null;
  }

  // toolkit/content/widgets/tabbox.js. Declares only the MozTab members that
  // code outside the class uses on a <tab> subclass. When tsc reports a MozTab
  // member as missing, declare that member here.
  class MozTab extends MozXULElement {
    readonly selected: boolean;
    linkedPanel: string;
    label: string;
  }

  type MozBrowser =
    import("../../toolkit/content/widgets/browser-custom-element.mjs").MozBrowser;
}
