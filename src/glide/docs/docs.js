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

  function init_toc() {
    const article = document.querySelector("article");
    if (!article) {
      return;
    }
    const selector = article.getAttribute("data-toc");
    const headings = article.querySelectorAll(selector);

    if (!selector || headings.length === 0) {
      return;
    }

    const toc_sidebar = document.createElement("aside");
    toc_sidebar.className = "toc-sidebar";

    const toc_title = document.createElement("div");
    toc_title.className = "toc-sidebar-title";
    toc_title.textContent = "On this page";
    toc_sidebar.appendChild(toc_title);

    const toc_nav = document.createElement("nav");
    toc_sidebar.appendChild(toc_nav);

    // Build nested structure with collapsible groups
    let current_group = null;
    const groups = new Map(); // Map heading id to group container
    let first_group = null; // Track the first group

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.dataset.level = level.toString();
      link.dataset.headingId = heading.id;

      let text = heading.textContent.trim();
      if (text.endsWith("#")) {
        text = text.slice(0, -1).trim();
      }
      if (text.startsWith("•")) {
        text = text.slice(1).trim();
      }
      link.textContent = text;
      link.title = text;

      // If it's a top-level heading (h1), create a new group
      if (level === 1) {
        const group_container = document.createElement("div");
        group_container.className = "toc-group";
        group_container.dataset.groupId = heading.id;

        const group_header = document.createElement("div");
        group_header.className = "toc-group-header";

        const expand_icon = document.createElement("span");
        expand_icon.className = "toc-group-icon";
        expand_icon.textContent = "▶";
        group_header.appendChild(expand_icon);

        group_header.appendChild(link);
        group_header.addEventListener("click", (e) => {
          // Don't toggle if clicking the link itself or its children
          if (e.target === link || link.contains(e.target)) {
            return; // Let the link handle navigation
          }
          e.preventDefault();
          // Only toggle if the group has items
          const group_items = group_container.querySelector(".toc-group-items");
          if (group_items && group_items.children.length > 0) {
            toggle_toc_group(group_container);
          }
        });

        const group_items = document.createElement("div");
        group_items.className = "toc-group-items";
        group_items.style.display = "none"; // Collapsed by default

        group_container.appendChild(group_header);
        group_container.appendChild(group_items);
        toc_nav.appendChild(group_container);

        // Track the first group
        if (first_group === null) {
          first_group = group_container;
        }

        current_group = group_items;
        groups.set(heading.id, group_container);
      } else {
        // It's a nested item (h2, h3, etc.)
        if (current_group) {
          current_group.appendChild(link);
        } else {
          // If no group exists, just add it directly (shouldn't happen with proper structure)
          toc_nav.appendChild(link);
        }
      }
    });

    // Hide collapsible icon for groups with no items
    groups.forEach((group_container) => {
      const group_items = group_container.querySelector(".toc-group-items");
      const has_items = group_items && group_items.children.length > 0;

      if (!has_items) {
        const icon = group_container.querySelector(".toc-group-icon");
        if (icon) {
          icon.style.display = "none";
        }
        const group_header = group_container.querySelector(".toc-group-header");
        if (group_header) {
          group_header.style.cursor = "default";
        }
        // Remove the empty group_items container
        if (group_items) {
          group_items.remove();
        }
      }
    });

    // Expand the first group by default if it has items
    if (first_group) {
      const group_items = first_group.querySelector(".toc-group-items");
      if (group_items && group_items.children.length > 0) {
        group_items.style.display = "block";
        const icon = first_group.querySelector(".toc-group-icon");
        if (icon) {
          icon.textContent = "▼";
        }
        first_group.classList.add("toc-group-expanded");
      }
    }

    const content_container = document.querySelector(".content-container");
    if (content_container) {
      content_container.appendChild(toc_sidebar);
    }

    init_toc_scroll_tracking(headings, toc_nav, groups);
  }

  function toggle_toc_group(group_container) {
    const group_items = group_container.querySelector(".toc-group-items");
    const icon = group_container.querySelector(".toc-group-icon");

    // Don't toggle if there are no items
    if (!group_items || group_items.children.length === 0) {
      return;
    }

    const is_expanded = group_items.style.display !== "none";

    if (is_expanded) {
      group_items.style.display = "none";
      if (icon) icon.textContent = "▶";
      group_container.classList.remove("toc-group-expanded");
    } else {
      group_items.style.display = "block";
      if (icon) icon.textContent = "▼";
      group_container.classList.add("toc-group-expanded");
    }
  }

  function init_toc_scroll_tracking(headings, toc_nav, groups = null) {
    const toc_sidebar = toc_nav.closest(".toc-sidebar");
    const toc_links = toc_nav.querySelectorAll("a");
    const visible_headings = new Set();
    let last_active_id = null;

    let scroll_animation_frame = null;
    function scroll_toc_to_active_link(link) {
      if (!link || !toc_sidebar) return;

      // Cancel any pending scroll animation
      if (scroll_animation_frame) {
        cancelAnimationFrame(scroll_animation_frame);
      }

      scroll_animation_frame = requestAnimationFrame(() => {
        const sidebar_rect = toc_sidebar.getBoundingClientRect();
        const link_rect = link.getBoundingClientRect();

        // Use smaller buffer zones for more responsive scrolling
        const top_buffer = 15;
        const bottom_buffer = 10;

        // Check if link is outside the visible area of the sidebar
        const is_above = link_rect.top < sidebar_rect.top + top_buffer;
        const is_below = link_rect.bottom > sidebar_rect.bottom - bottom_buffer;

        if (is_above || is_below) {
          // Calculate scroll position relative to the sidebar's scroll container
          const link_offset_top = link.offsetTop;
          const sidebar_height = toc_sidebar.clientHeight;
          const link_height = link.clientHeight;

          let target_scroll;
          const padding = 10;
          if (is_above) {
            target_scroll = link_offset_top - padding;
          } else {
            target_scroll = link_offset_top - sidebar_height + link_height + padding;
          }

          toc_sidebar.scrollTo({
            top: Math.max(0, Math.min(target_scroll, toc_sidebar.scrollHeight - sidebar_height)),
            behavior: "smooth",
          });
        }
        scroll_animation_frame = null;
      });
    }

    function update_active_link() {
      toc_links.forEach((link) => link.classList.remove("toc-active"));

      let active_link = null;
      let active_id = null;

      if (visible_headings.size === 0) {
        let closest_heading = null;
        let closest_distance = Infinity;

        headings.forEach((heading) => {
          const rect = heading.getBoundingClientRect();
          if (rect.top < 100) {
            const distance = Math.abs(rect.top);
            if (distance < closest_distance) {
              closest_distance = distance;
              closest_heading = heading;
            }
          }
        });

        if (closest_heading) {
          active_id = closest_heading.id;
          active_link = toc_nav.querySelector(`a[href="#${active_id}"]`);
          if (active_link) active_link.classList.add("toc-active");
        }
      } else {
        let first_visible = null;
        headings.forEach((heading) => {
          if (visible_headings.has(heading.id) && !first_visible) {
            first_visible = heading;
          }
        });

        if (first_visible) {
          active_id = first_visible.id;
          active_link = toc_nav.querySelector(`a[href="#${active_id}"]`);
          if (active_link) active_link.classList.add("toc-active");
        }
      }

      // Expand group if active link is inside it, or if the group header itself is active
      if (active_link && groups) {
        // Check if this is a group header (h1)
        const group_container = groups.get(active_id);
        if (group_container) {
          // The active item is a group header, expand it
          const group_items = group_container.querySelector(".toc-group-items");
          if (group_items && group_items.style.display === "none") {
            toggle_toc_group(group_container);
          }
        } else {
          // Check if the active link is inside a group
          const group_container = active_link.closest(".toc-group");
          if (group_container) {
            const group_items = group_container.querySelector(".toc-group-items");
            if (group_items && group_items.style.display === "none") {
              toggle_toc_group(group_container);
            }
          }
        }
      }

      // Only scroll TOC when active section changes
      if (active_link && active_id !== last_active_id) {
        last_active_id = active_id;
        scroll_toc_to_active_link(active_link);
      }
    }

    let update_animation_frame = null;
    function schedule_update() {
      if (update_animation_frame) {
        return;
      }
      update_animation_frame = requestAnimationFrame(() => {
        update_active_link();
        update_animation_frame = null;
      });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visible_headings.add(entry.target.id);
        } else {
          visible_headings.delete(entry.target.id);
        }
      });
      schedule_update();
    }, {
      rootMargin: "-10% 0px -80% 0px",
      threshold: 0,
    });

    headings.forEach((heading) => observer.observe(heading));

    window.addEventListener("scroll", () => {
      schedule_update();
    }, { passive: true });

    update_active_link();
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
