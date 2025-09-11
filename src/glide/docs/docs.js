// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

{
  window.open_search = function() {
    // error early if pagefind hasn't been loaded yet
    window.get_pagefind_ui();

    const search = document.getElementById("search");
    search.style.display = "unset";

    document.querySelector(".pagefind-ui__search-clear").style.display = "none";

    window.get_pagefind_ui().triggerSearch("");

    document.querySelector(".pagefind-ui__search-input").focus();
  };

  window.close_search = function() {
    const search = document.getElementById("search");
    if (search) {
      search.style.display = "none";

      /** @type {HTMLElement} */
      const input = document.querySelector(".pagefind-ui__search-input");
      if (input) {
        input.value = "";
      }
    }
  };

  window.toggle_search = function() {
    const search = document.getElementById("search");
    if (search.style.display === "" || search.style.display === "none") {
      console.debug("[toggle]: opening search");
      window.open_search();
    } else {
      console.debug("[toggle]: closing search");
      window.close_search();
    }
  };

  /**
   * @param {Event} event
   */
  function on_click(event) {
    if (event.buttons & 2) {
      // don't close on right click
      return;
    }

    /** @type {HTMLElement} */
    const search = document.getElementById("search");
    if (
      !search
      || search.style.display === ""
      || search.style.display === "none"
    ) {
      return;
    }

    /** @type {HTMLElement} */
    const ui = document.querySelector(".pagefind-ui");
    if (ui && !ui.contains(event.target)) {
      window.close_search();
    }
  }

  window.copy_codeblock = async function copy_codeblock(button) {
    const codeblock = button.closest("pre");
    if (!codeblock) {
      console.error("Could not find code block element");
      return;
    }

    await navigator.clipboard.writeText(codeblock.textContent.trimEnd() + "\n");

    button.classList.add("copied");
    setTimeout(() => {
      button.classList.remove("copied");
    }, 1000);
  };

  window.open_mobile_menu = function() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("mobile-nav-overlay");
    sidebar.classList.add("mobile-menu-open");
    overlay.classList.add("show");
    // prevent body scroll when menu is open
    document.body.style.overflow = "hidden";
  };

  window.close_mobile_menu = function() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("mobile-nav-overlay");
    sidebar.classList.remove("mobile-menu-open");
    overlay.classList.remove("show");
    // Restore body scroll
    document.body.style.overflow = "";
  };

  window.toggle_mobile_menu = function() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar && sidebar.classList.contains("mobile-menu-open")) {
      window.close_mobile_menu();
    } else {
      window.open_mobile_menu();
    }
  };

  window.get_pagefind_ui = function() {
    if (window.pagefind_ui) {
      return window.pagefind_ui;
    }

    if (typeof PagefindUI === "undefined") {
      // TODO(someday): display this error in the dom somewhere
      throw new Error("The pagefind script has not loaded yet");
    }

    window.pagefind_ui = new PagefindUI({ element: "#search", showSubResults: true, resetStyles: false });
    return window.pagefind_ui;
  };

  window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("search-button").addEventListener("click", () => {
      window.open_search();
    });

    document
      .getElementById("mobile-menu-toggle")
      .addEventListener("click", () => {
        window.toggle_mobile_menu();
      });

    // close menu when clicking outside
    document
      .getElementById("mobile-nav-overlay")
      .addEventListener("click", () => {
        window.close_mobile_menu();
      });

    document.addEventListener("keydown", event => {
      if (event.key.toLowerCase() === "/") {
        event.preventDefault();
        window.toggle_search();
      } else if (event.key === "Escape") {
        event.preventDefault();
        window.close_search();
        window.close_mobile_menu();
      }
    });

    document.addEventListener("mousedown", on_click);
    document.addEventListener("touchstart", on_click);
  });
}
