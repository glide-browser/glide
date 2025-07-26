// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/**
 * A collection of utils for interaction with Mozilla classes.
 */

/**
 * Copy the given data to the clipboard.
 *
 * By default this copies the data as `text/plain`, to customise this
 * pass `{ content_type: '..' }`.
 */
export function copy_to_clipboard(
  window: Window,
  data: string,
  props?: { content_type?: string },
) {
  const content_type = props?.content_type ?? "text/plain";

  const transferable = Cc["@mozilla.org/widget/transferable;1"]!.createInstance(Ci.nsITransferable);
  transferable.init(window.docShell!.QueryInterface!(Ci.nsILoadContext));
  transferable.addDataFlavor(content_type);
  transferable.setTransferData(content_type, to_istring(data));
  Services.clipboard.setData(
    transferable,
    // @ts-expect-error the generated types aren't smart enough to include `null`
    // as an allowed type, but it is supported at runtime
    /* owner */ null,
    /* type */ Services.clipboard.kGlobalClipboard,
  );
}

/**
 * Wrap a `string` with a `nsISupportsString` as some C++ interop
 * methods require it.
 */
export function to_istring(data: string) {
  let s = Cc["@mozilla.org/supports-string;1"]!.createInstance(Ci.nsISupportsString);
  s.data = data;
  return s;
}
