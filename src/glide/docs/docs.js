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

  /**
   * TOC configuration per page
   * Maps page filename to CSS selector for headings to include.
   * Only headings with `id` attributes are included.
   *
   * @example
   * "api.html": "h1[id], h2[id]"
   * "keys.html": "h1[id], h2[id], h3[id]"
   */
  const TOC_CONFIG = {
    "api.html": "h1[id], h2[id]",
    "keys.html": "h1[id], h2[id], h3[id]",
    "excmds.html": "h1[id], h2[id]",
    "hints.html": "h1[id], h2[id]",
    "changelog.html": "h1[id]",
    "config.html": "h1[id], h2[id]",
    "autocmds.html": "h1[id], h2[id]",
  };

  function init_toc() {
    const article = document.querySelector("article");
    if (!article) return;

    const pageName = window.location.pathname.split("/").pop() || "index.html";
    const selector = TOC_CONFIG[pageName];

    if (!selector) return;
    const headings = article.querySelectorAll(selector);

    const tocSidebar = document.createElement("aside");
    tocSidebar.className = "toc-sidebar";

    const tocTitle = document.createElement("div");
    tocTitle.className = "toc-sidebar-title";
    tocTitle.textContent = "On this page";
    tocSidebar.appendChild(tocTitle);

    const tocNav = document.createElement("nav");
    tocSidebar.appendChild(tocNav);

    headings.forEach((heading) => {
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.dataset.level = heading.tagName.charAt(1);

      let text = heading.textContent.trim();
      if (text.endsWith("#")) {
        text = text.slice(0, -1).trim();
      }
      if (text.startsWith("•")) {
        text = text.slice(1).trim();
      }
      link.textContent = text;
      link.title = text;

      tocNav.appendChild(link);
    });

    const contentContainer = document.querySelector(".content-container");
    if (contentContainer) {
      contentContainer.appendChild(tocSidebar);
    }

    init_toc_scroll_tracking(headings, tocNav);
  }

  function init_toc_scroll_tracking(headings, tocNav) {
    const tocSidebar = tocNav.closest(".toc-sidebar");
    const tocLinks = tocNav.querySelectorAll("a");
    const visibleHeadings = new Set();
    let lastActiveId = null;

    function scrollTocToActiveLink(link) {
      if (!link || !tocSidebar) return;

      const sidebarRect = tocSidebar.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();

      // Check if link is outside the visible area of the sidebar
      const isAbove = linkRect.top < sidebarRect.top + 60;
      const isBelow = linkRect.bottom > sidebarRect.bottom - 20;

      if (isAbove || isBelow) {
        // Use scrollTop instead of scrollIntoView to avoid affecting main page scroll
        const linkOffsetTop = link.offsetTop;
        const sidebarHeight = tocSidebar.clientHeight;
        const targetScroll = linkOffsetTop - sidebarHeight / 2 + link.clientHeight / 2;

        tocSidebar.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: "smooth",
        });
      }
    }

    function updateActiveLink() {
      tocLinks.forEach((link) => link.classList.remove("toc-active"));

      let activeLink = null;
      let activeId = null;

      if (visibleHeadings.size === 0) {
        let closestHeading = null;
        let closestDistance = Infinity;

        headings.forEach((heading) => {
          const rect = heading.getBoundingClientRect();
          if (rect.top < 100) {
            const distance = Math.abs(rect.top);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestHeading = heading;
            }
          }
        });

        if (closestHeading) {
          activeId = closestHeading.id;
          activeLink = tocNav.querySelector(`a[href="#${activeId}"]`);
          if (activeLink) activeLink.classList.add("toc-active");
        }
      } else {
        let firstVisible = null;
        headings.forEach((heading) => {
          if (visibleHeadings.has(heading.id) && !firstVisible) {
            firstVisible = heading;
          }
        });

        if (firstVisible) {
          activeId = firstVisible.id;
          activeLink = tocNav.querySelector(`a[href="#${activeId}"]`);
          if (activeLink) activeLink.classList.add("toc-active");
        }
      }

      // Only scroll TOC when active section changes
      if (activeLink && activeId !== lastActiveId) {
        lastActiveId = activeId;
        scrollTocToActiveLink(activeLink);
      }
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleHeadings.add(entry.target.id);
        } else {
          visibleHeadings.delete(entry.target.id);
        }
      });
      updateActiveLink();
    }, {
      rootMargin: "-10% 0px -80% 0px",
      threshold: 0,
    });

    headings.forEach((heading) => observer.observe(heading));

    let scrollTimeout;
    window.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateActiveLink, 50);
    }, { passive: true });

    updateActiveLink();
  }

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

    init_toc();
  });
}
