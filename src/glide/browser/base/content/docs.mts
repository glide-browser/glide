import type * as M from "@markdoc/markdoc";
import type {
  Highlighter,
  ThemeRegistrationResolved,
  ShikiTransformer,
  CodeToHastOptions,
  ThemedToken,
} from "shiki";
import type * as H from "hast";

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
const { firstx } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/arrays.mjs"
);
const { Words } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/strings.mjs"
);
const { assert_present } = ChromeUtils.importESModule(
  "chrome://glide/content/utils/guards.mjs"
);
const { GLIDE_EXCOMMANDS } = ChromeUtils.importESModule(
  "chrome://glide/content/browser-excmds-registry.mjs"
);

interface MarkdocConfig extends M.Config {
  /**
   * Set when rendering nodes from inside a heading.
   *
   * This is used to let child transforms behave differently,
   * e.g. for property go-to-def in API docs.
   */
  heading?: boolean;

  /**
   * This is very cursed but when rendering headings, we need to know if
   * the children rendered as anchors, as nested anchors aren't allowed.
   *
   * We accomplish this by passing in a different config to the children and
   * if the children would be rendered as an anchor, then the config is mutated
   * and this property is set to `true`.
   */
  nested_anchors?: boolean;
}

interface SidebarEntry {
  name: string;
  href: string;
  class?: string;
  target?: string;
}

const IGNORE_CODE_LANGS = new Set(["glide", "about", "file"]);

// GitHub-style admonition types
const ADMONITION_TYPES = new Set([
  "NOTE",
  "TIP",
  "IMPORTANT",
  "WARNING",
  "CAUTION",
]);

const SIDEBAR: SidebarEntry[] = [
  {
    name: "Quickstart",
    href: "quickstart.html",
  },
  {
    name: "API",
    href: "api.html",
  },
  {
    name: "Modes",
    href: "modes.html",
  },
  {
    name: "Ex Commands",
    href: "ex-commands.html",
  },
  {
    name: "Key Mappings",
    href: "key-mappings.html",
  },
  {
    name: "Hints",
    href: "hints.html",
  },
  {
    name: "FAQ",
    href: "faq.html",
  },
  {
    name: "Contributing",
    href: "contributing.html",
  },
];

// overrides for certain cases where we render type declarations differently
const API_REF_TO_HREF_MAP: Record<string, string> = {
  "glide.Options": "glide.o",
};

const tokenizer = new Markdoc.Tokenizer({ allowComments: true });

/**
 * Renders a markdown string to pretty HTML with all the surrounding docs layout.
 */
export async function markdown_to_html(
  source: string,
  highlighter: Highlighter,
  props: { nested_count: number; relative_dist_path: string }
): Promise<string> {
  const code_options = {
    include_go_to_def: props.relative_dist_path.endsWith("api.html"),
  } as const satisfies Partial<CodeHighlightOptions>;
  const ast = Markdoc.parse(tokenizer.tokenize(source));

  const tokyonight = highlighter.getTheme("tokyo-night");
  const tokyonight_light = highlighter.getTheme("tokyo-night-light");

  const dark_text_fg = "#c0caf5";
  const light_text_fg = "#343B58";

  const themes = {
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
            "variable.other.constant",
          ],
          settings: {
            // same colour as `entity.name` / variable access
            // e.g. `glide.keymaps.set()`
            //       ^^^^^
            foreground: dark_text_fg,
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
            foreground: light_text_fg,
          },
        },
      ],
    },
  } as const satisfies Record<string, ThemeRegistrationResolved>;

  // these are *only* used for the fallback inline code case, if a language is
  // explicitly requested in an inline block we still use the standard syntax
  // highlighting theme defined above.
  const inline_themes: Record<string, ThemeRegistrationResolved> = {
    dark: {
      ...themes.dark,
      name: "inline-tokynight",
      settings: [
        ...(themes.dark.settings ?? []),
        {
          // don't change the `<` or `|` operators
          scope: ["keyword.operator.relational", "keyword.operator.bitwise"],
          settings: { foreground: dark_text_fg },
        },
        // change the default foreground colour to match the text as that's what we need
        // for things like `\` which don't have specific tokens
        { settings: { foreground: dark_text_fg } },
      ],
    },
    light: {
      ...themes.light,
      name: "inline-tokyonight-light",
      settings: [
        ...(themes.light.settings ?? []),
        {
          // don't change the `<` or `|` operators
          scope: ["keyword.operator.relational", "keyword.operator.bitwise"],
          settings: { foreground: light_text_fg },
        },
        // change the default foreground colour to match the text as that's what we need
        // for things like `\` which don't have specific tokens
        { settings: { foreground: light_text_fg } },
      ],
    },
  };

  const language_themes: Partial<
    Record<string, Record<string, ThemeRegistrationResolved>>
  > = {
    html: {
      dark: {
        ...themes.dark,
        name: "html-tokyonight",
        settings: [
          ...(themes.dark.settings ?? []),
          {
            // avoid rendering unknown HTML element names differently
            scope: ["invalid", "invalid.illegal"],
            settings: { foreground: "#F7768E" },
          },
        ],
      },
      light: {
        ...themes.light,
        name: "html-tokyonight-light",
        settings: [
          ...(themes.light.settings ?? []),
          {
            // avoid rendering unknown HTML element names differently
            scope: ["invalid", "invalid.illegal"],
            settings: { foreground: "#8C4351" },
          },
        ],
      },
    },
  };

  // this is required to easily support syntax highlighting with markdoc
  //
  // there seems to be no way to return raw HTML from a `transform()` function
  // as it gets unconditionally escaped.
  const patches: Record<string, { html: string; content: string }> = {};
  var patch_counter = 0;

  function patch_id() {
    const id = `GLIDE_HIGHLIGHT_PATCH_${patch_counter}\n`;
    patch_counter++;
    return id;
  }

  /**
   * Return the joined raw string conents of each child, if the children
   * correspond to a HTML patch, then use the actual patch contents instead
   * of our magic string
   */
  function get_node_content(children: M.RenderableTreeNode[]): string {
    const content = children
      .filter(child => typeof child === "string")
      .join(" ");

    const patch = patches[content];
    if (patch) {
      return patch.content;
    }

    return content;
  }

  const lines = source.split("\n");
  const styles: string[] = [];
  const head: string[] = [];

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
      "api-heading": {
        attributes: {
          id: { type: String, required: true },
        },
        transform(node) {
          // note: this doesn't support inline usage, it must be
          // ```md
          // {% api-heading %}
          // glide.prefs.set(name, value): void
          // {% /api-heading %}
          // ```
          const first = node.lines[0]! + 1;
          const last = node.lines.at(-1)! - 1;
          const content = lines.slice(first, last).join("\n");

          const html_id = node.attributes["id"];
          const id = patch_id();

          const highlighted = highlighter.codeToHtml(content, {
            lang: "typescript",
            themes,
            transformers: [
              {
                pre(node) {
                  this.addClassToHast(node, "shiki-no-box");
                },
              },
            ],
          });
          patches[id] = {
            html: `<a href="#${html_id}"><h3 id="${html_id}" class="code-heading invisible-header">${highlighted}</h3></a>`,
            content: "",
          };
          return id;
        },
      },
      sup: {
        render: "sup",
        attributes: {},
      },
      html: {
        description: "Renders raw HTML content",
        transform(node) {
          // note: this doesn't support inline usage, it must be
          // ```md
          // {% html %}
          // <div>content</div>
          // {% /html %}
          // ```
          const first = node.lines[0]! + 1;
          const last = node.lines.at(-1)! - 1;
          const content = lines.slice(first, last);

          const id = patch_id();
          patches[id] = {
            html: content.join("\n"),
            content: "",
          };
          return id;
        },
      },
      styles: {
        description: "Inject custom CSS",
        transform(node) {
          // note: this doesn't support inline usage, it must be
          // ```md
          // {% styles %}
          // .foo {
          //   /* ... */
          // }
          // {% /styles %}
          // ```
          const first = node.lines[0]! + 1;
          const last = node.lines.at(-1)! - 1;
          const content = lines.slice(first, last);
          styles.push(content.join("\n"));
          return "";
        },
      },
      head: {
        description: "Inject custom <head> HTML",
        transform(node) {
          // note: this doesn't support inline usage, it must be
          // ```md
          // {% head %}
          // <link rel="stylesheet" ... />
          // {% /head %}
          // ```
          const first = node.lines[0]! + 1;
          const last = node.lines.at(-1)! - 1;
          const content = lines.slice(first, last);
          head.push(content.join("\n"));
          return "";
        },
      },
    },
    nodes: {
      blockquote: {
        /**
         * Transform GitHub-style admonitions:
         *
         * > [!NOTE]
         * > This is a note
         *
         * Into styled blocks.
         */
        transform(node, config) {
          const children = node.transformChildren(config);
          const DefaultBlockquote = new Markdoc.Tag("blockquote", {}, children);

          const first_para = children[0];
          if (
            !first_para ||
            typeof first_para !== "object" ||
            Array.isArray(first_para) ||
            first_para.name !== "p" ||
            !first_para.children ||
            !Array.isArray(first_para.children) ||
            !first_para.children.length
          ) {
            return DefaultBlockquote;
          }

          const first_child = first_para.children[0];
          if (typeof first_child !== "string") {
            return DefaultBlockquote;
          }

          const match = first_child.match(/^\[!(\w+)\]\s*/);
          if (match && ADMONITION_TYPES.has(match[1]!)) {
            const type = match[1]!.toLowerCase();

            // Remove the [!TYPE] prefix from the first child
            first_para.children[0] = first_child.replace(/^\[!\w+\]\s*/, "");

            // If the first paragraph is now empty or just whitespace, remove it
            if (
              first_para.children.length === 1 &&
              typeof first_para.children[0] === "string" &&
              first_para.children[0].trim() === ""
            ) {
              children.shift();
            }

            return new Markdoc.Tag(
              "div",
              { class: `admonition admonition-${type}` },
              [
                new Markdoc.Tag("div", { class: "admonition-title" }, [
                  `${type}`,
                ]),
                ...children,
              ]
            );
          }

          return DefaultBlockquote;
        },
      },
      link: {
        /**
         * `[...](./quickstart.md)` -> `<a href="./quickstart.html">`
         * `[...](/src/glide/browser/base/content/browser.mts)` -> `<a href="https://github.com/glide-browser/glide/blob/main/src/glide/browser/base/content/browser.mts" target="_blank" rel="noopener">`
         * `[...](https://example.com)` -> `<a href="https://example.com" target="_blank" rel="noopener">`
         */
        transform(node, config) {
          const href = assert_present(
            node.attributes["href"] as string | undefined,
            "Expected <link> element to have an href"
          );

          const children = node.transformChildren(config);

          const is_external =
            (href as string)?.startsWith("https://") ||
            (href as string)?.startsWith("http://");
          if (is_external) {
            const id = patch_id();
            patches[id] = {
              html: html`<a href="${href}" target="_blank" rel="noopener"
                >${children}</a
              >`,
              content: get_node_content(children),
            };
            return id;
          }

          // check if this is a markdown file
          if (href.endsWith(".md") || href.startsWith("#")) {
            return new Markdoc.Tag(
              "a",
              {
                ...node.attributes,
                href: href.replace(/\.md$/, ".html"),
              },
              node.transformChildren(config)
            );
          }

          // otherwise assume it's a link to a source file:
          if (!href.startsWith("/")) {
            throw new Error(
              "non-markdown links to files in the repository must use full paths, e.g. `/src/glide/moz.build`"
            );
          }

          const github_url = `https://github.com/glide-browser/glide/blob/main${href}`;
          const id = patch_id();
          patches[id] = {
            html: html`<a href="${github_url}" target="_blank" rel="noopener"
              >${children}</a
            >`,
            content: get_node_content(children),
          };
          return id;
        },
      },
      heading: {
        attributes: {
          id: { type: String, required: false },
          level: { type: Number, required: true, default: 1 },
          class: { type: String, required: false },
          style: { type: String, required: false },
        },

        /**
         * Make heading elements clickable with an anchor href.
         */
        transform(node, config: MarkdocConfig) {
          /** Key mappings -> key-mappings */
          function generate_anchor_id(children: M.RenderableTreeNode[]) {
            return get_node_content(children)
              .replace(/[?]/g, "")
              .replace(/\s+/g, "-")
              .toLowerCase();
          }

          let {
            id,
            level,
            class: $class,
            style,
            ...attributes
          } = node.transformAttributes(config);
          const nested_config = {
            ...config,
            heading: true,
          } as MarkdocConfig;
          const children = node.transformChildren(nested_config);
          if (!id) {
            id = generate_anchor_id(children);
          }

          level = assert_present(
            level ?? node.attributes["level"],
            "Expected level attribute to be set on headings"
          );
          const has_code = node.walk().some(child => child.type === "code");

          const Heading = new Markdoc.Tag(
            `h${level}`,
            {
              id,
              ...(style ? { style } : undefined),
              ...(has_code ? { class: Words([$class, "code-heading"]) }
              : $class ? { class: $class }
              : undefined),
            },
            children
          );

          if (nested_config.nested_anchors) {
            return Heading;
          }

          return new Markdoc.Tag("a", { ...attributes, href: `#${id}` }, [
            Heading,
          ]);
        },
      },
      code: {
        transform(node, config: MarkdocConfig) {
          const content = node.attributes["content"] as string;

          // support specifying the language of the inline code block
          // with `$lang:$content`
          const [, language, code] = content.match(/^(\w+):(.+)$/) || [];

          const default_language = "typescript";
          const highlighted =
            !language || !code ?
              // if the language isn't explicitly configured, then default to a slightly
              // modified version of TypeScript syntax highlighting as I've found
              // that generally to work quite well and looks much better than the default
              // <code> highlighting we have
              code_to_html(highlighter, code ?? content, {
                ...code_options,
                lang: language ?? default_language,
                themes: inline_themes,
                structure: "inline",
                config,
              })
            : IGNORE_CODE_LANGS.has(language) ?
              code_to_html(highlighter, content, {
                ...code_options,
                lang: default_language,
                themes: language_themes[default_language] ?? themes,
                structure: "inline",
                config,
              })
            : code_to_html(highlighter, code, {
                ...code_options,
                lang: language,
                themes: language_themes[language] ?? themes,
                structure: "inline",
                config,
              });

          const id = patch_id();
          patches[id] = {
            html: html`<span class="shiki-inline">${highlighted}</span>`,
            content: code ?? content,
          };
          return id;
        },
      },

      fence: {
        attributes: {
          language: { type: String, required: true },
          content: { type: String, required: true },
          caption: { type: String, required: false },
        },
        transform(node, config: MarkdocConfig) {
          // e.g. ```typescript {% caption="Example: key mapping to toggle CSS debugging" %}
          const caption = node.attributes["caption"];
          const content = node.attributes["content"];
          const language = node.attributes["language"];
          const highlighted = code_to_html(highlighter, content, {
            ...code_options,
            lang: language,
            themes,
            config,
          });

          const id = patch_id();
          patches[id] = {
            html:
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
                ),
            content,
          };
          return id;
        },
      },
    },
  });

  var html_body = Markdoc.renderers.html(content);
  if (Object.keys(patches).length) {
    const regex = new RegExp(`(${Object.keys(patches).join("|")})`, "g");

    let did_replace = false;
    do {
      did_replace = false;
      html_body = html_body.replaceAll(regex, substr => {
        did_replace = true;
        return assert_present(
          patches[substr]?.html,
          `could not resolve a highlight patch for ${substr}`
        );
      });
    } while (did_replace);
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
          ${styles
            .map(
              css => html`
                <style>
                  ${css}
                </style>
              `
            )
            .join("\n")}
          ${head.join("\n")}

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
                    ${SIDEBAR.map(({ name, href, class: class_, target }) => {
                      const abs = rel_to_dist + "/" + href;
                      return Html.li(
                        {
                          class: [
                            abs === current_href ? "is-active" : null,
                            class_,
                          ],
                        },
                        [Html.a({ href, target }, [name])]
                      );
                    }).join("")}
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

type CodeHighlightOptions = CodeToHastOptions & {
  include_go_to_def: boolean;
  config: MarkdocConfig;
};

function code_to_html(
  highlighter: Highlighter,
  code: string,
  options: CodeHighlightOptions
): string {
  if (options.include_go_to_def && options.config.heading) {
    for (const match of code.matchAll(/(.*): (glide\..*)/g)) {
      var [_, pre, ref] = match;
      ref = assert_present(ref);

      options = { ...options };
      options.transformers ??= [];
      options.transformers.push(
        make_heading_property_ref_transformer({
          preceding: assert_present(pre),
          ref,
          href: API_REF_TO_HREF_MAP[ref] ?? ref,
          config: options.config,
        })
      );
    }
  }

  return highlighter.codeToHtml(code, options);
}

/**
 * Transformer that turns code like
 *
 * `foo: glide.HintLocation`
 *
 * into
 *
 * `foo: <a href="#glide.HintLocation>glide.HintLocation</a>`
 */
function make_heading_property_ref_transformer({
  ref,
  href,
  preceding,
  config,
}: {
  ref: string;
  href: string;
  preceding: string;
  config: MarkdocConfig;
}): ShikiTransformer {
  return {
    tokens(all_tokens) {
      return all_tokens.map((tokens): ThemedToken[] => {
        const property_index = tokens.findIndex(
          token => token.content.startsWith(": ") && token.content.length > 2
        );
        if (property_index === -1) {
          console.error(tokens);
          throw new Error(`Expected to find a property index like \`: *\``);
        }

        // make sure that we'd only ever add anchors for the direct reference
        // e.g. `glide.HintLocation`, and not `: glide.HintLocation`.
        const token = tokens[property_index]!;
        return [
          ...tokens.slice(0, property_index),
          { ...token, content: ": " },
          { ...token, content: token.content.slice(2) },
          ...tokens.slice(property_index + 1),
        ];
      });
    },
    root(root) {
      const children = [...root.children] as H.ElementContent[];

      // the text that we want to replace with an anchor may be split up
      // across multiple `<span>`s, so iterate through all of them until
      // we find a contiguous run that matches the ref we're looking for.

      const runs: { start: number; end: number }[] = [];
      for (let i = 0; i < children.length; i++) {
        const child = children[i]!;
        if (!is_text_span(child)) continue;

        let acc = (child.children[0] as H.Text).value;
        if (acc === ref) {
          runs.push({ start: i, end: i });
          continue;
        }

        for (let j = i + 1; j < children.length; j++) {
          const child = children[j]!;
          if (!is_text_span(child)) {
            // non contiguous
            break;
          }

          acc += child.children[0].value;
          if (acc === ref) {
            runs.push({ start: i, end: j });
            i = j; // Skip past the run we just processed
            break;
          }
        }
      }

      if (!runs.length) {
        return;
      }

      config.nested_anchors = true;

      for (const { start, end } of runs) {
        children.splice(start, end, {
          type: "element",
          tagName: "a",
          properties: { href: `#${href}`, class: "go-to-def" },
          children: children.slice(start, end + 1),
        });
      }

      // you can't nest `<a>`s inside each other, and as this is for headings
      // we need to define the heading anchor for the *rest* of the heading
      // element.
      const run = firstx(runs);
      children.splice(0, run.start, {
        type: "element",
        tagName: "a",
        properties: {
          href: `#${preceding}`,
          style: "text-decoration: none",
        },
        children: children.slice(0, run.start),
      });

      return { ...root, children };
    },
  };
}

function is_text_span(
  node: H.RootContent | undefined
): node is H.Element & { children: [H.Text] } {
  return (
    node?.type === "element" &&
    node.tagName === "span" &&
    node.children.length === 1 &&
    node.children[0]!.type === "text"
  );
}
