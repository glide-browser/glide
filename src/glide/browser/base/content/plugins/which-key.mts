// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import type { Sandbox } from "../sandbox.mts";

export function init(sandbox: Sandbox) {
  const { glide } = sandbox;

  const modal = new Modal(sandbox);

  glide.autocmds.create("KeyStateChanged", async ({ mode, partial, sequence }) => {
    const maps = glide.keymaps.list(mode);

    if (partial) {
      // if the modal is visible, show immediately to avoid lag
      queue_timeout(modal.is_visible() ? 0 : glide.o.which_key_delay, () => {
        modal.show(maps, sequence);
      });
    } else {
      queue_timeout(0, () => {
        modal.hide();
      });
    }
  });

  glide.excmds.create({ name: "whichkey", description: "Show all mappings for the current mode" }, () => {
    queue_timeout(0, () => {
      modal.show(glide.keymaps.list(glide.ctx.mode), []);
    });
  });
}

let timeout_id: number | null = null;

function queue_timeout(ms: number, fn: () => void) {
  if (timeout_id) {
    clearTimeout(timeout_id);
  }
  timeout_id = setTimeout(fn, ms);
}

class Modal {
  #element: HTMLDivElement;
  #glide: Glide;
  #dom: Sandbox["DOM"];

  constructor(sandbox: Sandbox) {
    this.#dom = sandbox.DOM;
    this.#glide = sandbox.glide;
    this.#element = sandbox.DOM.create_element("div", {
      id: "which-key",
      style: {
        display: "none",
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        background: "var(--glide-cmdl-bg)",
        fontFamily: "var(--glide-cmdl-font-family)",
        fontSize: "var(--glide-cmdl-font-size)",
        lineHeight: "var(--glide-cmdl-line-height)",
        color: "var(--glide-cmdl-fg)",
        zIndex: "2147483646",
        boxShadow: "0 -8px 32px hsla(0, 0%, 0%, 0.4)",
        minWidth: "300px",
        maxWidth: "600px",
        maxHeight: "60vh",
        overflow: "hidden",
        borderRadius: "4px",
        border: "1px solid hsla(0, 0%, 100%, 0.1)",
      },
    });

    sandbox.document.children[0]!.appendChild(this.#element);
  }

  is_visible(): boolean {
    return this.#element.style.display === "block";
  }

  show(
    keymaps: glide.Keymap[],
    sequence: string[],
  ) {
    const relevant_maps = keymaps.filter(map => map.lhs && map.lhs.startsWith(sequence.join("")));

    const rows = relevant_maps.map(map => {
      const remaining = map.sequence.slice(sequence.length);

      return this.#dom.create_element("tr", {
        style: {
          height: "var(--glide-cmplt-option-height)",
        },
        children: [
          this.#dom.create_element("td", {
            textContent: pretty_print_keyseq(this.#glide, remaining),
            style: {
              paddingLeft: "1rem",
              paddingRight: "2rem",
              color: "var(--glide-cmplt-fg)",
              fontWeight: "600",
              minWidth: "3rem",
            },
          }),
          this.#dom.create_element("td", {
            textContent: get_map_description(map),
            style: {
              paddingRight: "1rem",
              color: "var(--glide-cmplt-fg)",
              opacity: "0.8",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          }),
        ],
      });
    });

    this.#element.replaceChildren(
      // header
      ...(sequence.length
        ? [this.#dom.create_element("div", {
          style: {
            padding: "0.5rem 1rem",
            borderBottom: "var(--glide-cmplt-border-top)",
            background: "var(--glide-header-first-bg)",
          },
          children: [
            this.#dom.create_element("span", {
              textContent: pretty_print_keyseq(this.#glide, sequence),
              style: {
                color: "var(--glide-cmplt-fg)",
                fontWeight: "var(--glide-header-font-weight)",
                fontSize: "var(--glide-header-font-size)",
              },
            }),
          ],
        })]
        : []),
      // content
      this.#dom.create_element("div", {
        style: {
          maxHeight: "calc(60vh - 3rem)",
          overflowY: "auto",
          overflowX: "hidden",
        },
        children: [
          this.#dom.create_element("table", {
            style: {
              width: "100%",
              borderSpacing: "0",
              fontSize: "var(--glide-cmplt-font-size)",
            },
            children: [
              this.#dom.create_element("tbody", { children: rows }),
            ],
          }),
        ],
      }),
    );

    this.#element.style.display = "block";
  }

  hide() {
    this.#element.style.display = "none";
  }
}

function pretty_print_keyseq(glide: Glide, sequence: string[]): string {
  return sequence.map((keyn: string) => keyn === "<leader>" ? glide.g.mapleader : keyn).join("");
}

function get_map_description(map: glide.Keymap): string {
  if (map.description) {
    return map.description;
  }

  if (typeof map.rhs === "string") {
    return map.rhs;
  }

  if (typeof map.rhs === "function" && map.rhs.name) {
    return `${map.rhs.name}()`;
  }

  return map.rhs.toString();
}
