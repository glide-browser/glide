// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

declare var document: Document;

document.addEventListener("DOMContentLoaded", () => {
  if (typeof GlideBrowser === "undefined") {
    // not sure *exactly* when this happens but my guess is that this script is called
    // from the hidden window as well, where we don't load the `GlideBrowser` singeleton.
    return;
  }

  const menu_element = document.getElementById("menu_glideMode");
  if (!menu_element) {
    // might as well protect against it being deleted
    return;
  }

  GlideBrowser.api.autocmds.create("ModeChanged", "*", ({ new_mode }) => {
    menu_element.setAttribute("label", `:: ${new_mode}`);
  });
});
