{
  window.open_search = function () {
    const search = document.getElementById("search");
    search.style.display = "unset";

    document.querySelector(".pagefind-ui__search-clear").style.display = "none";

    window.pagefind_ui.triggerSearch("");

    document.querySelector(".pagefind-ui__search-input").focus();
  };

  window.close_search = function () {
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

  window.toggle_search = function () {
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
      !search ||
      search.style.display === "" ||
      search.style.display === "none"
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

  window.addEventListener("DOMContentLoaded", () => {
    window.pagefind_ui = new PagefindUI({
      element: "#search",
      showSubResults: true,
      resetStyles: false,
    });

    document.getElementById("search-button").addEventListener("click", () => {
      window.open_search();
    });

    document.addEventListener("keydown", event => {
      if (event.key.toLowerCase() === "/") {
        event.preventDefault();
        window.toggle_search();
      } else if (event.key === "Escape") {
        event.preventDefault();
        window.close_search();
      }
    });

    document.addEventListener("mousedown", on_click);
    document.addEventListener("touchstart", on_click);
  });
}
