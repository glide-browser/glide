// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import type * as M from "@markdoc/markdoc";
import type * as H from "hast";
import type { CodeToHastOptions, Highlighter, ShikiTransformer, ThemedToken, ThemeRegistrationResolved } from "shiki";

const Html = ChromeUtils.importESModule("chrome://glide/content/utils/html.mjs");
const { default: Markdoc } = ChromeUtils.importESModule("chrome://glide/content/bundled/markdoc.mjs");
const { markdown, html } = ChromeUtils.importESModule("chrome://glide/content/utils/dedent.mjs");
const { Words } = ChromeUtils.importESModule("chrome://glide/content/utils/strings.mjs");
const { assert_present } = ChromeUtils.importESModule("chrome://glide/content/utils/guards.mjs");
const { GLIDE_EXCOMMANDS } = ChromeUtils.importESModule("chrome://glide/content/browser-excmds-registry.mjs");

interface MarkdocConfig extends M.Config {
  /**
   * Set when rendering nodes from inside a heading.
   *
   * This is used to let child transforms behave differently,
   * e.g. for property go-to-def in API docs.
   */
  heading?: boolean;
}

interface SidebarEntry {
  name: string;
  href: string;
  class?: string;
  target?: string;
}

const IGNORE_CODE_LANGS = new Set(["glide", "about", "file", "stderr", "auto_activate", "action"]);

// GitHub-style admonition types
const ADMONITION_TYPES = new Set([
  "NOTE",
  "TIP",
  "IMPORTANT",
  "WARNING",
  "CAUTION",
]);

const SIDEBAR: SidebarEntry[] = [
  { name: "Tutorial", href: "tutorial.html" },
  { name: "Config", href: "config.html" },
  { name: "Keys", href: "keys.html" },
  { name: "API", href: "api.html" },
  { name: "Autocmds", href: "autocmds.html" },
  { name: "Excmds", href: "excmds.html" },
  { name: "Hints", href: "hints.html" },
  { name: "Extensions", href: "extensions.html" },
  { name: "Firefox", href: "firefox.html" },
  { name: "CommandLine", href: "commandline.html" },
  { name: "Editor", href: "editor.html" },
  { name: "FAQ", href: "faq.html" },
  { name: "Cookbook", href: "cookbook.html" },
  { name: "Security", href: "security.html" },
  { name: "Privacy", href: "privacy.html" },
  { name: "Changelog", href: "changelog.html" },
  { name: "Contributing", href: "contributing.html" },
  { name: "Chat", href: "chat.html" },
];

// overrides for certain cases where we render type declarations differently
const API_REF_TO_HREF_MAP: Record<string, string> = { "glide.Options": "glide.o" };

const tokenizer = new Markdoc.Tokenizer({ allowComments: true });

/**
 * Renders a markdown string to pretty HTML with all the surrounding docs layout.
 */
export async function markdown_to_html(
  source: string,
  highlighter: Highlighter,
  props: { nested_count: number; relative_dist_path: string },
): Promise<string> {
  const code_options = { include_go_to_def: props.relative_dist_path.endsWith("api.html") } as const satisfies Partial<
    CodeHighlightOptions
  >;
  const ast = Markdoc.parse(tokenizer.tokenize(source), { slots: true });

  const state = new RenderState(source.split("\n"), highlighter, code_options);

  const content = state.transform(ast);

  var html_body = Markdoc.renderers.html(content);
  if (Object.keys(state.patches).length) {
    const regex = new RegExp(`(${Object.keys(state.patches).join("|")})`, "g");

    let did_replace = false;
    do {
      did_replace = false;
      html_body = html_body.replaceAll(regex, substr => {
        did_replace = true;
        return assert_present(state.patches[substr]?.html, `could not resolve a highlight patch for ${substr}`);
      });
    } while (did_replace);
  }

  const rel_to_dist = "../".repeat(props.nested_count - 1).slice(0, -1) || ".";
  const current_href = rel_to_dist + "/" + props.relative_dist_path;

  const title = state.title ?? "Glide Docs";
  const description = state.description ?? "an extensible and keyboard-focused web browser.";

  return html`
    <!DOCTYPE html>
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, user-scalable=yes"
        />
        <meta name="author" content="Robert Craigie" />
        <meta
          name="description"
          content="${description}" />

        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://glide-browser.app/${props.relative_dist_path}" />
        <meta property="og:image" content="https://glide-browser.app/logo1024.png" />
        <meta property="og:site_name" content="Glide Browser" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="https://glide-browser.app/logo1024.png" />

        <link rel="icon" href="${rel_to_dist}/logo.png" />
        <link rel="stylesheet" href="${rel_to_dist}/reset.css?v=" />
        <link rel="stylesheet" href="${rel_to_dist}/docs.css?v=" />
        <link rel="preload" as="image" href="${rel_to_dist}/logo.webp" />
        <link
          rel="preload"
          href="${rel_to_dist}/BerkeleyMono-Regular.woff2"
          as="font"
          type="font/woff2"
          crossorigin="anonymous" />
        <link rel="canonical" href="${canonical_url(props.relative_dist_path)}" />

        ${
    state.styles
      .map(css =>
        html`
          <style>
            ${css}
          </style>
        `
      )
      .join("\n")
  }
        ${state.head.join("\n")}

        <script async src="${rel_to_dist}/pagefind/pagefind-ui.js?v="></script>
        <script src="${rel_to_dist}/docs.js?v="></script>
      </head>
      <body>
        <!-- copy icons -->
        <svg style="display: none;" xmlns="http://www.w3.org/2000/svg">
          <symbol id="copy-icon" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor">
            <path
              d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </symbol>
          <symbol id="check-icon" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor">
            <path
              d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </symbol>
        </svg>

        <button
          class="mobile-menu-toggle"
          id="mobile-menu-toggle"
          aria-label="Toggle navigation menu"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="M3 12h18M3 6h18M3 18h18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <div class="mobile-nav-overlay" id="mobile-nav-overlay"></div>
        <div class="main-container">
          <div id="search"></div>
          <div class="content-container">
            <nav class="sidebar" id="sidebar">
              <ul class="tree">
                <li class="glide-sidenav-heading">
                  <a
                    href="${rel_to_dist}/index.html"
                    class="glide-sidenav-heading-link"
                  >
                    <img src="${rel_to_dist}/logo.webp" class="glide-sidenav-heading-img" width="48" height="48" alt="Glide logo" />
                    Glide
                  </a>
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
                    ${
    SIDEBAR.map(({ name, href, class: class_, target }) => {
      const abs = rel_to_dist + "/" + href;
      return Html.li({
        class: [
          abs === current_href ? "is-active" : null,
          class_,
        ],
      }, [Html.a({ href, target }, [name])]);
    }).join("")
  }
                    <li>
                      <a
                        href="https://github.com/glide-browser/glide"
                        rel="me"
                        class="github-logo"
                        target="_blank"
                        rel="noopener"
                        aria-label="GitHub"
                        ><svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17" aria-hidden="true">
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
${html_body}
          </div>
        </div>
      </body>
    </html>
  `;
}

class RenderState {
  lines: string[];
  styles: string[];
  head: string[];
  title: string | null = null;
  description: string | null = null;

  // this is required to easily support syntax highlighting with markdoc
  //
  // there seems to be no way to return raw HTML from a `transform()` function
  // as it gets unconditionally escaped.
  patches: Record<string, { html: string; content: string }> = {};
  patch_counter = 0;

  highlighter: Highlighter;
  themes: Record<string, ThemeRegistrationResolved>;
  inline_themes: Record<string, ThemeRegistrationResolved>;
  language_themes: Partial<Record<string, Record<string, ThemeRegistrationResolved>>>;
  code_options: Partial<CodeHighlightOptions> & { include_go_to_def: {} };

  constructor(
    lines: string[],
    highlighter: Highlighter,
    code_options: Partial<CodeHighlightOptions> & { include_go_to_def: {} },
  ) {
    this.lines = lines;
    this.styles = [];
    this.head = [];
    this.highlighter = highlighter;
    this.code_options = code_options;

    const resolved = resolve_themes(highlighter);
    this.themes = resolved.themes;
    this.inline_themes = resolved.inline_themes;
    this.language_themes = resolved.language_themes;
  }

  get config(): M.Config {
    return {
      tags: {
        "excmd-list": {
          transform(_, config) {
            return Markdoc.transform(Markdoc.parse(
              GLIDE_EXCOMMANDS.map(exmcd =>
                markdown`
                  ## :${exmcd.name} {% .excmd-heading %}

                  ${exmcd.description}
                `
              ).join("\n\n"),
              // @ts-ignore
              config,
            ));
          },
        },
        "api-heading": {
          attributes: { id: { type: String, required: true } },
          transform: (node, config) => {
            // note: this doesn't support inline usage, it must be
            // ```md
            // {% api-heading %}
            // glide.prefs.set(name, value): void
            // {% /api-heading %}
            // ```
            const first = node.lines[0]! + 1;
            const last = node.lines.at(-1)! - 1;
            const content = this.lines.slice(first, last).join("\n");

            const html_id = node.attributes["id"];

            const highlighted = code_to_html(this.highlighter, content, {
              ...this.code_options,
              config,
              lang: "typescript",
              themes: this.themes,
              transformers: [
                {
                  pre(node) {
                    this.addClassToHast(node, "shiki-no-box");
                    node.children.push({ type: "text", value: " " });
                    node.children.push({
                      type: "element",
                      tagName: "a",
                      properties: { "class": "heading-anchor", href: `#${html_id}` },
                      children: [{ type: "text", value: "#" }],
                    });
                  },
                },
              ],
            });

            return new Markdoc.Tag(`h3`, { id: html_id, class: "code-heading invisible-header" }, [
              this.html({ html: highlighted, content: "" }),
            ]);
          },
        },
        details: {
          description: "Renders a <details> tag",
          attributes: {
            heading: { required: false, type: Boolean },
          },
          slots: {
            summary: { required: false },
          },
          transform: (node, config) => {
            const summary = node.slots["summary"];

            const Children = [
              ...(node.attributes["id"] ? [new Markdoc.Tag("div", { id: node.attributes["id"] })] : []),
              ...node.transformChildren(config),
            ];
            if (!summary) {
              return new Markdoc.Tag("details", {}, Children);
            }

            // the return type of .transform() is a little funky here, according to the docs
            // https://github.com/markdoc/markdoc/discussions/342 it should not return an array
            const Summary = summary.transform(config) as M.RenderableTreeNode[];
            const id = node.attributes["id"] ?? (node.attributes["heading"] ? this.generate_anchor_id(Summary) : null);

            return new Markdoc.Tag("details", {}, [
              new Markdoc.Tag("summary", {}, [
                ...Summary,
                ...(id ? [" ", new Markdoc.Tag("a", { href: `#${id}`, class: "heading-anchor" }, ["#"])] : []),
              ]),
              ...(id ? [new Markdoc.Tag("div", { id })] : []),
              ...Children,
            ]);
          },
        },
        sup: { render: "sup", attributes: {} },
        html: {
          description: "Renders raw HTML content",
          transform: (node) => {
            // note: this doesn't support inline usage, it must be
            // ```md
            // {% html %}
            // <div>content</div>
            // {% /html %}
            // ```
            const first = node.lines[0]! + 1;
            const last = node.lines.at(-1)! - 1;
            const content = this.lines.slice(first, last);

            return this.html({ html: content.join("\n"), content: "" });
          },
        },
        styles: {
          description: "Inject custom CSS",
          transform: (node) => {
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
            const content = this.lines.slice(first, last);
            this.styles.push(content.join("\n"));
            return "";
          },
        },
        head: {
          description: "Inject custom <head> HTML",
          transform: (node) => {
            // note: this doesn't support inline usage, it must be
            // ```md
            // {% head %}
            // <link rel="stylesheet" ... />
            // {% /head %}
            // ```
            const first = node.lines[0]! + 1;
            const last = node.lines.at(-1)! - 1;
            const content = this.lines.slice(first, last);
            this.head.push(content.join("\n"));
            return "";
          },
        },
        meta: {
          description: "Set custom meta tags for this page, only description is supported.",
          attributes: { description: { type: String, required: false } },
          transform: (node, config) => {
            const attributes = node.transformAttributes(config);
            this.description = attributes["description"] ?? null;
            return "";
          },
        },
        link: {
          attributes: { href: { type: String, required: true }, "class": { type: String, required: false } },
          transform: this.render_link.bind(this),
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
              !first_para
              || typeof first_para !== "object"
              || Array.isArray(first_para)
              || first_para.name !== "p"
              || !first_para.children
              || !Array.isArray(first_para.children)
              || !first_para.children.length
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
                first_para.children.length === 1
                && typeof first_para.children[0] === "string"
                && first_para.children[0].trim() === ""
              ) {
                children.shift();
              }

              return new Markdoc.Tag("div", { class: `admonition admonition-${type}` }, [
                new Markdoc.Tag("div", { class: "admonition-title" }, [
                  `${type}`,
                ]),
                ...children,
              ]);
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
          transform: this.render_link.bind(this),
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
          transform: (node, config: MarkdocConfig) => {
            let {
              id,
              level,
              class: $class,
              style,
              ...attributes
            } = node.transformAttributes(config);
            const nested_config = { ...config, heading: true } as MarkdocConfig;
            const children = node.transformChildren(nested_config);
            if (!id) {
              id = this.generate_anchor_id(children);
            }

            level = assert_present(level ?? node.attributes["level"], "Expected level attribute to be set on headings");
            if (level === 1 && !this.title) {
              // extract the first h1 and use it as the page title
              this.title = this.get_node_content(children);
            }

            const has_code = node.walk().some(child => child.type === "code");

            const Heading = new Markdoc.Tag(`h${level}`, {
              id,
              ...(style ? { style } : undefined),
              ...(has_code
                ? { class: Words([$class, "code-heading"]) }
                : $class
                ? { class: $class }
                : undefined),
            }, [
              ...children,

              // in some cases we add a clickable anchor to the right of the heading instead of the heading
              // itself as the heading may contain anchor, and nesting anchors inside anchors is invalid
              ...(this.code_options.include_go_to_def
                ? [
                  " ",
                  new Markdoc.Tag("a", { href: `#${id}`, class: "heading-anchor" }, ["#"]),
                ]
                : []),
            ]);

            if (this.code_options.include_go_to_def) {
              return Heading;
            }

            return new Markdoc.Tag("a", { ...attributes, href: `#${id}` }, [
              Heading,
            ]);
          },
        },
        code: {
          transform: (node, config: MarkdocConfig) => {
            const content = node.attributes["content"] as string;

            // support specifying the language of the inline code block
            // with `$lang:$content`
            const [, language, code] = content.match(/^(\w+):(.+)$/) || [];

            const default_language = "typescript";
            const highlighted = !language || !code
              // if the language isn't explicitly configured, then default to a slightly
              // modified version of TypeScript syntax highlighting as I've found
              // that generally to work quite well and looks much better than the default
              // <code> highlighting we have
              ? code_to_html(this.highlighter, code ?? content, {
                ...this.code_options,
                lang: language ?? default_language,
                themes: this.inline_themes,
                structure: "inline",
                config,
              })
              : IGNORE_CODE_LANGS.has(language)
              ? code_to_html(this.highlighter, content, {
                ...this.code_options,
                lang: default_language,
                themes: this.language_themes[default_language] ?? this.themes,
                structure: "inline",
                config,
              })
              : code_to_html(this.highlighter, code, {
                ...this.code_options,
                lang: language,
                themes: this.language_themes[language] ?? this.themes,
                structure: "inline",
                config,
              });

            return this.html({
              html: html`<span class="shiki-inline">${highlighted}</span>`,
              content: code ?? content,
            });
          },
        },

        fence: {
          attributes: {
            language: { type: String, required: true },
            content: { type: String, required: true },
            caption: { type: String, required: false },
            copy: { type: Boolean, required: false, default: true },
          },
          transform: (node, config: MarkdocConfig) => {
            // e.g. ```typescript {% caption="Example: key mapping to toggle CSS debugging" copy=false %}
            const caption = node.attributes["caption"] as string | undefined;
            const copy = node.attributes["copy"] !== false;
            const content = node.attributes["content"] as string;
            const language = node.attributes["language"] as string;
            const highlighted = code_to_html(this.highlighter, content, {
              ...this.code_options,
              lang: language,
              themes: this.themes,
              config,
              grammarContextCode: node.attributes["highlight_prefix"],
            });

            const copy_button = copy ? copy_to_clipboard_button() : "";
            return this.html({
              html: caption
                ? html`
                  <figure>
                  ${highlighted.replace("</pre>", `${copy_button}</pre>`)}
                    <figcaption>${caption}</figcaption>
                  </figure>
                `
                : highlighted.replace("</pre>", `${copy_button}</pre>`),
              content,
            });
          },
        },
      },
    };
  }

  transform(ast: M.Node): M.RenderableTreeNode {
    const root = Markdoc.transform(ast, this.config);
    if (!(root instanceof Markdoc.Tag)) throw new Error("Expected root node to be a Tag");

    root.children = [
      this.html({
        html: html`
          <div class="alpha-warning">
            <svg class="alpha-warning-icon" width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Glide is in <strong>alpha</strong>. There will be missing features and bugs.</span>
          </div>
        `,
        content: "",
      }),
      ...root.children,
    ];
    return this.#transform(root);
  }

  #transform(node: M.RenderableTreeNode): M.RenderableTreeNode {
    if (node instanceof Markdoc.Tag) {
      // markdoc renders our {% details %} by wrapping it in a <p> for some reason which affects the output
      // so we just switch it to a <div>, ideally we'd not render the parent element at all but that's more
      // tricky, so deferring that for later.
      const first_child = node.children[0]!;
      if (node.name === "p" && first_child instanceof Markdoc.Tag && first_child.name === "details") {
        node.name = "div";
      }

      node.children = node.children.map((child) => this.#transform(child));
    }

    return node;
  }

  html(patch: { html: string; content: string }) {
    const id = `GLIDE_HIGHLIGHT_PATCH_${this.patch_counter}\n`;
    this.patch_counter++;
    this.patches[id] = patch;
    return id;
  }

  /** Key mappings -> key-mappings */
  generate_anchor_id(children: M.RenderableTreeNode[]) {
    return this.get_node_content(children)
      .replace(/[?]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
  }

  /**
   * Return the joined raw string conents of each child, if the children
   * correspond to a HTML patch, then use the actual patch contents instead
   * of our magic string
   */
  get_node_content(children: M.RenderableTreeNode[]): string {
    const content = children
      .filter(child => typeof child === "string")
      .map(child => this.patches[child]?.content ?? child)
      .join(" ");

    const patch = this.patches[content];
    if (patch) {
      return patch.content;
    }

    return content;
  }

  render_link(node: M.Node, config: M.Config): M.RenderableTreeNode {
    const href = assert_present(
      node.attributes["href"] as string | undefined,
      "Expected <link> element to have an href",
    );

    const children = node.transformChildren(config);

    const is_external = href.startsWith("https://") || href.startsWith("http://") || href.startsWith("mailto:")
      || href.startsWith("ircs://");
    if (is_external) {
      return this.html({
        html: html`<a href="${href}" target="_blank" rel="noopener"
          >${children}</a
        >`,
        content: this.get_node_content(children),
      });
    }

    // check if this is a markdown / html file
    if (
      href.endsWith(".html") || href.endsWith(".md") || href.startsWith("#")
      || href.replace(/\.md#.*/, ".md").endsWith(".md")
    ) {
      return new Markdoc.Tag(
        "a",
        { ...node.attributes, href: href.replace(/\.md/, ".html") },
        node.transformChildren(config),
      );
    }

    // otherwise assume it's a link to a source file:
    if (!href.startsWith("/")) {
      throw new Error(
        `non-markdown links (${href}) to source files in the repository must use full paths, e.g. \`/src/glide/moz.build\``,
      );
    }

    const github_url = `https://github.com/glide-browser/glide/blob/main${href}`;
    return this.html({
      html: html`<a href="${github_url}" target="_blank" rel="noopener">${children}</a> `,
      content: this.get_node_content(children),
    });
  }
}

interface ResolvedThemes {
  themes: Record<string, ThemeRegistrationResolved>;
  inline_themes: Record<string, ThemeRegistrationResolved>;
  language_themes: Partial<Record<string, Record<string, ThemeRegistrationResolved>>>;
}

export function resolve_themes(highlighter: Highlighter): ResolvedThemes {
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

  return {
    themes,
    inline_themes,
    language_themes,
  };
}

function copy_to_clipboard_button() {
  return html`
    <button
      class="copy-button"
      onclick="copy_codeblock(this)"
      aria-label="Copy code"
    >
      <svg class="copy-icon" aria-hidden="false">
        <use href="#copy-icon"></use>
      </svg>
      <svg class="check-icon" aria-hidden="true">
        <use href="#check-icon"></use>
      </svg>
    </button>
  `;
}

type CodeHighlightOptions = CodeToHastOptions & {
  include_go_to_def: boolean | undefined;
  config: MarkdocConfig | undefined;
};

export function code_to_html(
  highlighter: Highlighter,
  code: string,
  options: CodeHighlightOptions,
): string {
  if (options.include_go_to_def) {
    for (const match of code.matchAll(/(.*)(: |<|\[)(glide\.[^<>\][]*)(>)?/g)) {
      var [_, __, ___, ref] = match;
      ref = assert_present(ref);

      options = { ...options };
      options.transformers ??= [];
      options.transformers.push(make_heading_property_ref_transformer({
        ref,
        href: API_REF_TO_HREF_MAP[ref] ?? ref,
      }));
    }
  }

  if (options.lang === "path") {
    // bash does a reasonable job syntax highlighting paths
    options.lang = "bash";
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
}: {
  ref: string;
  href: string;
}): ShikiTransformer {
  return {
    tokens(all_tokens) {
      return all_tokens.map((tokens): ThemedToken[] => {
        const property_index = tokens.findIndex(token => token.content.startsWith(": ") && token.content.length > 2);
        if (property_index === -1) {
          return tokens;
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
      }).map((tokens): ThemedToken[] => {
        const start_index = tokens.findIndex((token) =>
          token.content.includes("<") && ref.startsWith(token.content.slice(token.content.indexOf("<") + 1))
        );
        if (start_index === -1) {
          return tokens;
        }

        const start_token = tokens[start_index]!;
        const left_content_index = start_token.content.indexOf("<");

        return [
          ...tokens.slice(0, start_index),
          { ...start_token, content: start_token.content.slice(0, left_content_index) },
          { ...start_token, content: "<" },
          { ...start_token, content: start_token.content.slice(left_content_index + 1) },
          ...tokens.slice(start_index + 1),
        ];
      });
    },

    root(root) {
      return { ...root, children: add_go_to_def([...root.children] as H.ElementContent[]) };

      function add_go_to_def(children: H.ElementContent[]): H.ElementContent[] {
        // the text that we want to replace with an anchor may be split up
        // across multiple `<span>`s, so iterate through all of them until
        // we find a contiguous run that matches the ref we're looking for.

        const runs: { start: number; end: number }[] = [];
        for (let i = 0; i < children.length; i++) {
          const child = children[i]!;

          if (!is_text_span(child)) {
            if (child.type === "element") {
              // if we have an element child, it may include nested children that can be turned into go-to-defs
              children.splice(i, 1, { ...child, children: add_go_to_def([...child.children]) });
            }
            continue;
          }

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
          return children;
        }

        // TODO: this is probably broken if there are multiple runs
        for (const { start, end } of runs) {
          children.splice(start, end - start + 1, {
            type: "element",
            tagName: "a",
            properties: { href: `#${href}`, class: "go-to-def" },
            children: children.slice(start, end + 1),
          });
        }

        return children;
      }
    },
  };
}

function is_text_span(
  node: H.RootContent | undefined,
): node is H.Element & { children: [H.Text] } {
  return (
    node?.type === "element"
    && node.tagName === "span"
    && node.children.length === 1
    && node.children[0]!.type === "text"
  );
}

function canonical_url(relative_dist_path: string): string {
  const path = relative_dist_path.replace(/\.html$/, "");
  if (path === "index") {
    return "https://glide-browser.app/";
  }
  return `https://glide-browser.app/${path}`;
}
