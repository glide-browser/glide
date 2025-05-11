import type { RenderableTreeNode } from "@markdoc/markdoc";
import type { Highlighter, ThemeRegistrationResolved } from "shiki";

const Html = ChromeUtils.importESModule(
  "chrome://glide/content/utils/html.mjs"
);
const { format } = ChromeUtils.importESModule(
  "chrome://glide/content/bundled/prettier.mjs"
);
const prettier_html = ChromeUtils.importESModule(
  "chrome://glide/content/bundled/prettier-html.mjs"
);
const { default: Markdoc } = ChromeUtils.importESModule(
  "chrome://glide/content/bundled/markdoc.mjs"
);
const { markdown, html } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/dedent.mjs"
);
const { assert_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);
const { GLIDE_EXCOMMANDS } = ChromeUtils.importESModule(
  "chrome://glide/content/browser-excmds.mjs"
);

interface SidebarEntry {
  name: string;
  href: string;
  class?: string;
  target?: string;
  sub?: SidebarEntry[];
}

const SIDEBAR: SidebarEntry[] = [
  {
    name: "Quickstart",
    href: "quickstart.html",
  },
  {
    name: "Modes",
    href: "modes.html",
  },
  {
    name: "Excmds",
    href: "excmds.html",
  },
  {
    name: "Autocmds",
    href: "autocmds.html",
  },
  {
    name: "Keys",
    href: "keys.html",
  },
  {
    name: "Philosophy",
    href: "glide-philosophy.html",
  },
  {
    name: "Glossary",
    href: "glossary.html",
  },
  // {
  //   name: "Reference",
  //   href: "reference.html",
  //   sub: [
  //     {
  //       name: "Keys",
  //       href: "reference/keys.html",
  //     },
  //     {
  //       name: "Excmds",
  //       href: "reference/excmds.html",
  //     },
  //   ],
  // },
  {
    name: "FAQ",
    href: "faq.html",
  },
];

const tokenizer = new Markdoc.Tokenizer({ allowComments: true });

/**
 * Renders a markdown string to pretty HTML with all the surrounding docs layout.
 */
export async function markdown_to_html(
  source: string,
  highlighter: Highlighter,
  props: { nested_count: number; relative_dist_path: string }
): Promise<string> {
  const ast = Markdoc.parse(tokenizer.tokenize(source));

  const tokyonight = highlighter.getTheme("tokyo-night");
  const tokyonight_light = highlighter.getTheme("tokyo-night-light");

  const themes: Record<string, ThemeRegistrationResolved> = {
    dark: {
      ...tokyonight,
      settings: [
        ...(tokyonight.settings ?? []),
        {
          // override variable declarations, the default highlighting is
          // just slightly different from keywords which I absolutely hate
          scope: [
            "meta.definition.variable variable.other.constant",
            "meta.definition.variable variable.other.readwrite",
            "variable.declaration.hcl variable.other.readwrite.hcl",
            "meta.mapping.key.hcl variable.other.readwrite.hcl",
            "variable.other.declaration",
          ],
          settings: {
            // same colour as `entity.name` / variable access
            // e.g. `glide.keymaps.set()`
            //       ^^^^^
            foreground: "#c0caf5",
          },
        },
      ],
    },
    light: {
      ...tokyonight_light,
      settings: [
        ...(tokyonight_light.settings ?? []),
        {
          // override variable declarations, the default highlighting is
          // just slightly different from keywords which I absolutely hate
          scope: [
            "meta.definition.variable variable.other.constant",
            "meta.definition.variable variable.other.readwrite",
            "variable.declaration.hcl variable.other.readwrite.hcl",
            "meta.mapping.key.hcl variable.other.readwrite.hcl",
            "variable.other.declaration",
          ],
          settings: {
            // same colour as `entity.name` / variable access
            // e.g. `glide.keymaps.set()`
            //       ^^^^^
            foreground: "#343B58",
          },
        },
      ],
    },
  };

  // this is required to easily support syntax highlighting with markdoc
  //
  // there seems to be no way to return raw HTML from a `transform()` function
  // as it gets unconditionally escaped.
  const patches: Record<string, string> = {};
  var patch_counter = 0;

  function patch_id() {
    const id = `GLIDE_HIGHLIGHT_PATCH_${patch_counter}\n`;
    patch_counter++;
    return id;
  }

  const content = Markdoc.transform(ast, {
    tags: {
      "excmd-list": {
        transform(_, config) {
          return Markdoc.transform(
            Markdoc.parse(
              GLIDE_EXCOMMANDS.map(
                exmcd => markdown`
                  ## :${exmcd.name} {% .excmd-heading %}

                  ${exmcd.description}
                `
              ).join("\n\n"),
              // @ts-ignore
              config
            )
          );
        },
      },
      sup: {
        render: "sup",
        attributes: {},
      },
    },
    nodes: {
      link: {
        /**
         * `[...](./quickstart.md)` -> `<a href="./quickstart.html">`
         * `[...](https://example.com)` -> `<a href="https://example.com" target="_blank" rel="noopener">`
         */
        transform(node, config) {
          const href = assert_present(
            node.attributes["href"] as string | undefined,
            "Expected <link> element to have an href"
          );

          const is_external = (href as string)?.startsWith("https://");
          if (!is_external) {
            return new Markdoc.Tag(
              "a",
              {
                ...node.attributes,
                href: href.replace(/\.md$/, ".html"),
              },
              node.transformChildren(config)
            );
          }

          const id = patch_id();
          patches[id] = html`<a href="${href}" target="_blank" rel="noopener"
            >${node.transformChildren(config)}</a
          >`;
          return id;
        },
      },
      heading: {
        attributes: {
          level: { type: Number, required: true, default: 1 },
        },

        /**
         * Make heading elements clickable with an anchor href.
         */
        transform(node, config) {
          /** Key mappings -> key-mappings */
          function generate_anchor_id(children: RenderableTreeNode[]) {
            return children
              .filter(child => typeof child === "string")
              .join(" ")
              .replace(/[?]/g, "")
              .replace(/\s+/g, "-")
              .toLowerCase();
          }

          const attributes = node.transformAttributes(config);
          const children = node.transformChildren(config);
          const id = generate_anchor_id(children);
          const level = assert_present(
            attributes["level"] ?? node.attributes["level"],
            "Expected level attribute to be set on headings"
          );

          return new Markdoc.Tag("a", { ...attributes, href: `#${id}` }, [
            new Markdoc.Tag(`h${level}`, { id }, children),
          ]);
        },
      },
      code: {
        transform(node) {
          // throw new Error("brug");
          const content = node.attributes["content"] as string;

          // support specifying the language of the inline code block
          // with `$lang:$content`
          const [, language, code] = content.match(/^(\w+):(.+)$/) || [];

          if (!language || !code || language === "glide") {
            // no syntax highlighting if a language isn't given
            return new Markdoc.Tag("code", node.transformAttributes(), [
              content,
            ]);
          }

          const highlighted = highlighter.codeToHtml(code, {
            lang: language,
            themes,
            // structure: "inline",
            transformers: [
              {
                // span(node) {
                //   console.log(node);
                //   throw new Error("wow");
                // },
                // line(node, line) {
                //   console.log("foo", node.children);
                //   throw new Error("foo");
                //   //j
                // },
              },
            ],
          });

          const id = patch_id();
          patches[id] = html`<span class="shiki-inline">${highlighted}</span>`;
          return id;
        },
      },

      fence: {
        attributes: {
          language: { type: String, required: true },
          content: { type: String, required: true },
          caption: { type: String, required: false },
        },
        transform(node) {
          // e.g. ```typescript {% caption="Example: key mapping to toggle CSS debugging" %}
          const caption = node.attributes["caption"];
          const content = node.attributes["content"];
          const language = node.attributes["language"];
          const highlighted = highlighter.codeToHtml(content, {
            lang: language,
            themes,
            // transformers: [
            //   {
            //     line(node, line) {
            //       console.log(node.children);
            //       throw new Error("foo");
            //     },
            //   },
            // ],
          });

          const id = patch_id();
          patches[id] =
            caption ?
              // indenting the highlighted html results in bad whitespace
              // prettier-ignore
              html`
                <figure>
                ${highlighted.replace('</pre>', `${copy_to_clipboard_button()}</pre>`)}
                  <figcaption>${caption}</figcaption>
                </figure>
              `
            : highlighted.replace(
                "</pre>",
                `${copy_to_clipboard_button()}</pre>`
              );
          return id;
        },
      },
    },
  });

  var html_body = Markdoc.renderers.html(content);
  if (Object.keys(patches).length) {
    const regex = new RegExp(`(${Object.keys(patches).join("|")})`, "g");
    html_body = html_body.replaceAll(regex, substr =>
      assert_present(
        patches[substr],
        `could not resolve a highlight patch for ${substr}`
      )
    );
  }

  const rel_to_dist = "../".repeat(props.nested_count - 1).slice(0, -1) || ".";
  const current_href = rel_to_dist + "/" + props.relative_dist_path;

  return await format(
    html`
      <!DOCTYPE html>
      <html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, user-scalable=yes"
          />
          <meta name="author" content="Robert Craigie" />
          <title>Glide Docs</title>
          <link rel="icon" href="${rel_to_dist}/logo.png" />

          <link rel="stylesheet" href="${rel_to_dist}/docs.css" />
          <link
            rel="stylesheet"
            href="${rel_to_dist}/monospace-web/reset.css"
          />
          <link
            rel="stylesheet"
            href="${rel_to_dist}/monospace-web/index.css"
          />

          <script src="${rel_to_dist}/pagefind/pagefind-ui.js"></script>
          <script src="${rel_to_dist}/docs.js"></script>
        </head>
        <div class="main-container">
          <div id="search"></div>
          <div class="content-container">
            <nav class="sidebar">
              <ul class="tree">
                <li class="glide-sidenav-heading">
                  <a
                    href="${rel_to_dist}/index.html"
                    class="glide-sidenav-heading-link"
                  >
                    <img
                      src="${rel_to_dist}/logo.png"
                      class="glide-sidenav-heading-img"
                    />
                    Glide</a
                  >
                  <button
                    type="button"
                    class="search-button"
                    aria-label="Search"
                    id="search-button"
                  >
                    /
                  </button>
                </li>
                <li>
                  <ul class="sidenav">
                    ${SIDEBAR.map(entry =>
                      sidebar_entry({ current_href, rel_to_dist }, entry)
                    ).join("")}
                    <li>
                      <a
                        href="https://github.com/glide-browser/glide"
                        rel="me"
                        class="github-logo"
                        target="_blank"
                        ><svg viewBox="0 0 24 24" fill="currentColor">
                          <path
                            d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.08 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3Z"
                          ></path>
                        </svg>
                      </a>
                    </li>
                  </ul>
                </li>
              </ul>
            </nav>
            <!-- prettier-ignore -->
            <body>${html_body}</body>
          </div>
        </div>
      </html>
    `,
    { parser: "html", plugins: [prettier_html] }
  );
}

function sidebar_entry(
  props: { rel_to_dist: string; current_href: string },
  { name, href, class: class_, target, sub }: SidebarEntry
): string {
  const abs = props.rel_to_dist + "/" + href;
  return Html.li(
    {
      class: [abs === props.current_href ? "is-active" : null, class_],
    },
    [
      Html.a({ href, target }, [name]),
      ...(sub?.length ?
        Html.ul(
          undefined,
          // TODO: buggy links back to main
          // TODO: buggy focus back to main
          sub.map(subentry => sidebar_entry(props, subentry))
        )
      : []),
    ]
  );
}

function copy_to_clipboard_button() {
  return html`
    <button
      class="copy-button"
      onclick="copy_codeblock(this)"
      aria-label="Copy code"
    >
      <svg
        class="copy-icon"
        data-slot="icon"
        aria-hidden="false"
        fill="none"
        stroke-width="1.5"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
      </svg>

      <svg
        class="check-icon"
        data-slot="icon"
        aria-hidden="true"
        fill="none"
        stroke-width="1.5"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
      </svg>
    </button>
  `;
}
