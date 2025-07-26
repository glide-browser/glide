// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

declare var document: Document;

// placeholder function for html`...` usage for syntax highlighting
const html = String.raw;

export type WindowMessage = {
  type: "set-mappings";
  mappings: Map<GlideMode, KeyMappingIPC[]>;
};

const state = { mappings: new Map<GlideMode, KeyMappingIPC[]>() };

window.addEventListener("message", (event: Event & { data: WindowMessage }) => {
  console.debug("window message", event);

  switch (event.data.type) {
    case "set-mappings": {
      state.mappings = event.data.mappings;
      render_mappings();
      break;
    }
    default:
      ((_: never) => {})(event.data.type);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const sections = document.querySelectorAll(".mode-section");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const mode = (tab as HTMLElement).dataset["mode"];

      // Update active tab
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      // Show appropriate sections
      if (mode === "all") {
        sections.forEach(s => ((s as HTMLElement).style.display = "block"));
      } else {
        sections.forEach(s => {
          (s as HTMLElement).style.display = (s as HTMLElement).dataset["mode"] === mode ? "block" : "none";
        });
      }
    });
  });

  const search_input = document.getElementById("mappings-search") as HTMLInputElement;
  search_input.addEventListener("input", (e: Event) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    const mapping_items = document.querySelectorAll(".mapping-item");

    mapping_items.forEach(item => {
      const text = item.textContent?.toLowerCase() ?? "";
      (item as HTMLElement).style.display = text.includes(query) ? "flex" : "none";
    });

    // Show all mode sections when searching
    // TODO: don't do this
    if (query) {
      sections.forEach(s => ((s as HTMLElement).style.display = "block"));
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelector("[data-mode=\"all\"]")?.classList.add("active");
    }
  });

  render_mappings();

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "/" && document.activeElement !== search_input) {
      e.preventDefault();
      search_input.focus();
    }
  });
});

function render_mappings() {
  console.debug("rendering mappings");

  for (const [mode, mappings] of state.mappings.entries()) {
    const container = document.querySelector(`[data-mode="${mode}"] .mappings-grid`);
    if (!container) {
      throw new Error(`no ${mode} tab`);
    }

    container.innerHTML = mappings
      .map(mapping =>
        html`
          <div class="mapping-item">
            <span class="mapping-key"
              >${escape_html(mapping.sequence.join(""))}</span
            >
            <span class="mapping-arrow">→</span>
            <span class="mapping-command">${escape_html(mapping.command)}</span>
            ${
          mapping.description
            ? `<span class="mapping-description">${escape_html(mapping.description)}</span>`
            : ""
        }
          </div>
        `
      )
      .join("");
  }
}

function escape_html(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML.toString();
}
