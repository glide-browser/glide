// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

interface DocsWindow extends Window {
  open_search(): void;
  close_search(): void;
  toggle_search(): void;

  open_mobile_menu(): void;
  close_mobile_menu(): void;
  toggle_mobile_menu(): void;

  copy_codeblock(button: HTMLButtonElement): void;

  pagefind_ui: PageFindUI | undefined;
  get_pagefind_ui(): PageFindUI;
}

interface PageFindUI {
  triggerSearch(input: string): void;
}

declare var PagefindUI: any;

{
  const docs = window as any as DocsWindow;

  docs.open_search = function() {
    // error early if pagefind hasn't been loaded yet
    docs.get_pagefind_ui();

    const search = document.getElementById("search")!;
    search.style.display = "unset";

    query_selector(".pagefind-ui__search-clear")!.style.display = "none";

    docs.get_pagefind_ui().triggerSearch("");

    query_selector(".pagefind-ui__search-input")!.focus();
  };

  docs.close_search = function() {
    const search = document.getElementById("search");
    if (search) {
      search.style.display = "none";

      const input = query_selector<HTMLInputElement>(".pagefind-ui__search-input");
      if (input) {
        input.value = "";
      }
    }
  };

  docs.toggle_search = function() {
    const search = document.getElementById("search")!;
    if (search.style.display === "" || search.style.display === "none") {
      console.debug("[toggle]: opening search");
      docs.open_search();
    } else {
      console.debug("[toggle]: closing search");
      docs.close_search();
    }
  };

  function on_click(event: MouseEvent | TouchEvent) {
    if ("buttons" in event && event.buttons & 2) {
      // don't close on right click
      return;
    }

    const search = document.getElementById("search");
    if (
      !search
      || search.style.display === ""
      || search.style.display === "none"
    ) {
      return;
    }

    const ui = query_selector(".pagefind-ui");
    if (ui && !ui.contains(event.target as Node | null)) {
      docs.close_search();
    }
  }

  docs.copy_codeblock = async function copy_codeblock(button) {
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

  docs.open_mobile_menu = function() {
    const sidebar = document.getElementById("sidebar")!;
    const overlay = document.getElementById("mobile-nav-overlay")!;
    sidebar.classList.add("mobile-menu-open");
    overlay.classList.add("show");
    // prevent body scroll when menu is open
    document.body.style.overflow = "hidden";
  };

  docs.close_mobile_menu = function() {
    const sidebar = document.getElementById("sidebar")!;
    const overlay = document.getElementById("mobile-nav-overlay")!;
    sidebar.classList.remove("mobile-menu-open");
    overlay.classList.remove("show");
    // Restore body scroll
    document.body.style.overflow = "";
  };

  docs.toggle_mobile_menu = function() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar && sidebar.classList.contains("mobile-menu-open")) {
      docs.close_mobile_menu();
    } else {
      docs.open_mobile_menu();
    }
  };

  docs.get_pagefind_ui = function() {
    if (docs.pagefind_ui) {
      return docs.pagefind_ui;
    }

    if (typeof PagefindUI === "undefined") {
      // TODO(someday): display this error in the dom somewhere
      throw new Error("The pagefind script has not loaded yet");
    }

    docs.pagefind_ui = new PagefindUI({ element: "#search", showSubResults: true, resetStyles: false });
    return docs.pagefind_ui!;
  };

  function init_toc() {
    const article = query_selector("article");
    if (!article) {
      return;
    }

    const headings = article.querySelectorAll<HTMLElement>(article.getAttribute("data-toc")!);
    if (headings.length === 0) {
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

    let first_group: HTMLElement | null = null as any;
    let current_group: HTMLElement | null = null;
    const groups = new Map<string, HTMLElement>();

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
          if (e.target === link || link.contains(e.target as Node | null)) {
            return; // Let the link handle navigation
          }

          // Only toggle if the group has items
          const group_items = group_container.querySelector(".toc-group-items");
          if (group_items && group_items.children.length > 0) {
            e.preventDefault();
            toggle_toc_group(group_container);
          }
        });

        const group_items = document.createElement("div");
        group_items.className = "toc-group-items";
        group_items.style.display = "none"; // Collapsed by default

        group_container.appendChild(group_header);
        group_container.appendChild(group_items);
        toc_nav.appendChild(group_container);

        if (first_group == null) {
          first_group = group_container;
        }

        current_group = group_items;
        groups.set(heading.id, group_container);
      } else if (current_group) {
        // It's a nested item (h2, h3, etc.)
        current_group.appendChild(link);
      }
    });

    // hide collapsible icon for groups with no items
    groups.forEach((group_container) => {
      const group_items = group_container.querySelector(".toc-group-items");
      const has_items = group_items && group_items.children.length > 0;

      if (!has_items) {
        const icon = group_container.querySelector<HTMLElement>(".toc-group-icon");
        if (icon) {
          icon.style.display = "none";
        }
        const group_header = group_container.querySelector<HTMLElement>(".toc-group-header");
        if (group_header) {
          group_header.style.cursor = "default";
        }
        if (group_items) {
          group_items.remove();
        }
      }
    });

    // expand the first group by default if it has items
    if (first_group) {
      const group_items = first_group.querySelector<HTMLElement>(".toc-group-items");
      if (group_items && group_items.children.length > 0) {
        group_items.style.display = "block";
        const icon = first_group.querySelector(".toc-group-icon");
        if (icon) {
          icon.textContent = "▼";
        }
        first_group.classList.add("toc-group-expanded");
      }
    }

    const content_container = query_selector(".content-container");
    if (content_container) {
      content_container.appendChild(toc_sidebar);
    }

    init_toc_scroll_tracking(headings, toc_nav, groups);
  }

  function toggle_toc_group(group_container: HTMLElement) {
    const group_items = group_container.querySelector<HTMLElement>(".toc-group-items");
    const icon = group_container.querySelector(".toc-group-icon");

    if (!group_items || group_items.children.length === 0) {
      // nothing to toggle
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

  function init_toc_scroll_tracking(
    headings: NodeListOf<HTMLElement>,
    toc_nav: HTMLElement,
    groups: Map<string, HTMLElement>,
  ) {
    const toc_sidebar = toc_nav.closest(".toc-sidebar");
    const toc_links = toc_nav.querySelectorAll("a");
    let last_active_id: string | null = null;

    // small buffer for scrolling calculation for smoother scrolls
    const padding = 10;
    const top_buffer = 15;
    const bottom_buffer = 10;

    let scroll_animation_frame: number | null = null;
    function scroll_toc_to_active_link(link: HTMLElement) {
      if (!link || !toc_sidebar) return;

      if (scroll_animation_frame) {
        cancelAnimationFrame(scroll_animation_frame);
      }

      scroll_animation_frame = requestAnimationFrame(() => {
        const sidebar_rect = toc_sidebar.getBoundingClientRect();
        const link_rect = link.getBoundingClientRect();

        // check if link is outside the visible area of the sidebar
        const is_above = link_rect.top < sidebar_rect.top + top_buffer;
        const is_below = link_rect.bottom > sidebar_rect.bottom - bottom_buffer;

        if (is_above || is_below) {
          // calculate scroll position relative to the sidebar's scroll container
          const link_offset_top = link.offsetTop;
          const sidebar_height = toc_sidebar.clientHeight;
          const link_height = link.clientHeight;

          const target_scroll = is_above
            ? link_offset_top - padding
            : link_offset_top - sidebar_height + link_height + padding;

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

      let active_id: string | null = null as any;
      let active_link: HTMLElement | null = null;

      // Find the heading closest to the top of the viewport that has scrolled past the threshold.
      const threshold = 100;
      let best_heading: HTMLElement | null = null as any;
      let best_distance = -Infinity;

      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top < threshold && rect.top > best_distance) {
          best_distance = rect.top;
          best_heading = heading;
        }
      });

      if (best_heading) {
        active_id = best_heading.id;
        active_link = toc_nav.querySelector(`a[href="#${active_id}"]`);
        if (active_link) {
          active_link.classList.add("toc-active");
        }
      }

      // expand group if active link is inside it, or if the group header itself is active
      if (active_link && active_id && groups) {
        // check if this is a group header (h1)
        const group_container = groups.get(active_id);
        if (group_container) {
          // the active item is a group header, expand it
          const group_items = group_container.querySelector<HTMLElement>(".toc-group-items");
          if (group_items && group_items.style.display === "none") {
            toggle_toc_group(group_container);
          }
        } else {
          // check if the active link is inside a group
          const group_container = active_link.closest<HTMLElement>(".toc-group");
          if (group_container) {
            const group_items = group_container.querySelector<HTMLElement>(".toc-group-items");
            if (group_items && group_items.style.display === "none") {
              toggle_toc_group(group_container);
            }
          }
        }
      }

      if (active_link && active_id !== last_active_id) {
        last_active_id = active_id;
        scroll_toc_to_active_link(active_link);
      }
    }

    let update_animation_frame: number | null = null;
    function schedule_update() {
      if (update_animation_frame) {
        return;
      }
      update_animation_frame = requestAnimationFrame(() => {
        update_active_link();
        update_animation_frame = null;
      });
    }

    docs.addEventListener("scroll", () => {
      schedule_update();
    }, { passive: true });

    update_active_link();
  }

  docs.addEventListener("DOMContentLoaded", () => {
    document.getElementById("search-button")!.addEventListener("click", () => {
      docs.open_search();
    });

    document
      .getElementById("mobile-menu-toggle")!
      .addEventListener("click", () => {
        docs.toggle_mobile_menu();
      });

    // close menu when clicking outside
    document
      .getElementById("mobile-nav-overlay")!
      .addEventListener("click", () => {
        docs.close_mobile_menu();
      });

    document.addEventListener("keydown", event => {
      if (event.key.toLowerCase() === "/") {
        event.preventDefault();
        docs.toggle_search();
      } else if (event.key === "Escape") {
        event.preventDefault();
        docs.close_search();
        docs.close_mobile_menu();
      }
    });

    document.addEventListener("mousedown", on_click);
    document.addEventListener("touchstart", on_click);

    init_toc();
  });

  function query_selector<E extends HTMLElement = HTMLElement>(selectors: string): E | null {
    return document.querySelector<E>(selectors) as any;
  }
}
