// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

declare var document: Document;

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    document.body!.focus();
  }, 1000);

  const template = document.getElementById("highlight-template") as HTMLTemplateElement;

  const observer = new MutationObserver((mutations) => {
    const has_new_nodes = mutations.some((mutation) => mutation.addedNodes.length > 0);
    if (has_new_nodes) {
      replace_highlight_templates();
    }
  });
  observer.observe(document.body!, { childList: true, subtree: true });

  replace_highlight_templates();

  function replace_highlight_templates() {
    // replace all `<highlight>` elements with the fake shiki highlight'd version
    document.querySelectorAll("highlight").forEach(element => {
      const fragment = template.content.cloneNode(true) as HTMLElement;
      fragment.querySelector("span span")!.textContent = element.textContent;
      element.replaceWith(fragment);
    });
  }
});
