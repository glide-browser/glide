import "./polyfill-chromeutils.cjs";
import assert from "assert";
import { execa } from "execa";
import fs from "node:fs/promises";
import Path from "path";
import TSM from "ts-morph";
import { ts } from "ts-morph";
import { Project } from "ts-morph";
import { Node } from "ts-morph";
import { css, html, markdown } from "../src/glide/browser/base/content/utils/dedent.mts";
import { assert_never, assert_present } from "../src/glide/browser/base/content/utils/guards.mts";
import { replace_surrounding, Words } from "../src/glide/browser/base/content/utils/strings.mts";
import { DOCS_DIR, GLIDE_BROWSER_CONTENT_DIR, ROOT_DIR } from "./canonical-paths.mts";

const STYLES = css`
  h1, h2 {
    font-size: revert !important;
  }

  .index a {
    text-decoration: none;
  }
`;

const DISABLED_PROPERTIES = new Set([
  // we don't generate the overloads well right now
  "glide.autocmds",
]);
const DPRINT_EXE = Path.join(ROOT_DIR, "node_modules", ".bin", "dprint");

async function main() {
  const project = new Project({ tsConfigFilePath: Path.join(ROOT_DIR, "tsconfig.json") });
  const file = assert_present(project.getSourceFile(Path.join(GLIDE_BROWSER_CONTENT_DIR, "glide.d.ts")));

  const global_decl = file.getFirstChildByKind(ts.SyntaxKind.ModuleDeclaration)!;
  assert.equal(global_decl?.getName(), "global");

  const inner = assert_present(global_decl.getFirstChildByKind(ts.SyntaxKind.ModuleBlock));

  const index: IndexEntry[] = [];
  const content: string[] = [];

  for (const part of traverse(inner)) {
    if (typeof part === "string") {
      content.push(part);
    } else if (part.type === "index") {
      index.push(part);
    } else {
      throw assert_never(part.type);
    }
  }

  const output: string[] = [
    markdown`
      {% styles %}
      ${STYLES}
      {% /styles %}
    `,
    "\n\n",
    markdown`
      > [!IMPORTANT]
      > These reference docs are not complete yet, some symbols and types are missing completely.
      >
      > For a full reference, see the [types](./config.md#types) file that Glide generates.
    `,
    "\n\n",
    generate_index(index),
    ...content,
  ];

  const output_md = Path.join(DOCS_DIR, "api.md");
  await fs.writeFile(output_md, output.join(""));
  await execa(DPRINT_EXE, ["fmt", output_md]);
}

interface ParentEntry {
  name: string;
  node: Node;
}

type TraverseEntry = string | IndexEntry;

function* traverse(
  node: Node,
  parents: ParentEntry[] = [],
): Generator<TraverseEntry> {
  // note: we assume everything here is exported as it should only be called
  //       for types in our `declare global`module.

  const directives = get_directives(node);
  if (directives.skip) {
    return;
  }

  if (Node.isModuleBlock(node)) {
    yield* traverse_children(node, parents);
    return;
  }

  // normally `declare var glide`
  if (Node.isVariableStatement(node)) {
    const docs = node.getJsDocs()[0];

    // should only be one for `var glide`
    for (const declaration of node.getDeclarations()) {
      const QualifiedName = [
        ...parents.map(({ name }) => name),
        declaration.getName(),
      ].join(".");

      yield* Header(QualifiedName, { parents, id: QualifiedName, index: false });
      yield* Docs(docs);
      yield "\n";
      yield* traverse_children(declaration, [
        ...parents,
        { name: declaration.getName(), node: declaration },
      ]);
    }

    return;
  }

  // e.g. `{ foo: string }`
  if (Node.isTypeLiteral(node)) {
    for (const child of children(node)) {
      if (!Node.isPropertySignature(child) && !Node.isMethodSignature(child)) {
        continue;
      }
      yield* traverse(child, parents);
    }

    return;
  }

  if (Node.isMethodSignature(node)) {
    const QualifiedName = [
      ...parents.map(({ name }) => name),
      node.getName(),
    ].join(".");

    yield { type: "index", kind: "method", id: QualifiedName };

    yield "\n\n";
    yield `{% api-heading id="${QualifiedName}" %}\n`;
    yield render_method_signature(node, { name: QualifiedName }) + "\n";
    yield "{% /api-heading %}\n";
    yield "\n";
    yield* Docs(node.getJsDocs()[0]);
    return;
  }

  // my_prop: MyType
  if (Node.isPropertySignature(node)) {
    // my_prop
    const ident = node.getFirstChildByKindOrThrow(ts.SyntaxKind.Identifier);
    // MyType
    const inner = children(node)[1]!;

    const Name = ident.getText();
    const QualifiedName = [...parents.map(({ name }) => name), Name].join(".");

    if (DISABLED_PROPERTIES.has(QualifiedName)) {
      // wip properties
      return;
    }

    const docs = node.getJsDocs()[0];

    // `foo: string` or `foo: undefined`
    if (is_keyword(inner) || Node.isTypeReference(inner)) {
      yield* Header(`${QualifiedName}: ${inner.getText()}`, { kind: "property", parents, id: QualifiedName });
      yield* Docs(docs);
      yield "\n";
      yield* traverse_further(inner, [...parents, { name: Name, node }]);
      return;
    }

    yield* Header(`${QualifiedName}`, { kind: "property", parents, id: QualifiedName });
    yield* Docs(docs);

    yield* traverse_further(inner, [...parents, { name: Name, node }]);

    return;
  }

  if (Node.isTypeReference(node)) {
    const parent = node.getParent();
    const directives = get_directives(parent);
    if (!directives.expand_type_reference) {
      // only render children of a TypeReference in this scope if we've been
      // explicitly told to do so, as this is useful in some cases, e.g. `glide.o`
      // but we definitely do not want to duplicate types everywhere.
      return;
    }

    const symbol = node.getTypeName().getSymbol();
    const declaration = symbol?.getDeclarations()[0];
    const defn = declaration?.getFirstChildByKind(ts.SyntaxKind.TypeLiteral);
    if (defn) {
      yield* traverse_children(defn, parents);
      return;
    }

    console.warn("type reference with no TypeLiteral declaration is not supported");
    return;
  }

  // namespace glide
  if (Node.isModuleDeclaration(node)) {
    if (node.getName() !== "glide") {
      console.warn(`skipping ${node.getName()} module`);
      return;
    }

    yield* Header(`Types`, { parents, id: "types", attrs: "style=\"margin-top: 3em !important\"", index: false });

    const block = node.getFirstChildByKindOrThrow(ts.SyntaxKind.ModuleBlock);
    yield* traverse_children(block, [...parents, { name: "glide", node }]);
    return;
  }

  // export type RGBString = ...
  if (Node.isTypeAliasDeclaration(node)) {
    const Name = node.getName();
    const QualifiedName = [...parents.map(({ name }) => name), Name].join(".");
    const body = children(node)[2];

    if (body) {
      yield* Header(`${QualifiedName}: ${replace_surrounding(body.print(), "`", "'")}`, {
        parents,
        id: QualifiedName,
        kind: "type",
      });
    } else {
      console.warn(`no body for ${Name}`);
    }
    return;
  }

  console.warn("unhandled TS Node:", node.getKindName());
}

function* Header(
  Code: string,
  { parents, id, attrs, index = true, kind }:
    & { parents: ParentEntry[]; id: string; attrs?: string }
    & ({ index: false; kind?: undefined } | { index?: true; kind: IndexEntry["kind"] }),
): Generator<TraverseEntry> {
  if (index && kind) {
    yield { type: "index", kind, id };
  }

  const Bullet = parents.length === 1 ? "• " : "";

  const HeaderHash = Array(parents.length + 2).join("#");

  yield `\n${HeaderHash} ${Bullet}\`${Code}\` {% ${Words([`id="${id}"`, attrs])} %}\n`;
}

interface DocsDirectives {
  skip?: boolean;
  expand_type_reference?: boolean;
}

const DIRECTIVES_PATTERN = /\@(.*)/g;

function get_directives(node: TSM.Node): DocsDirectives {
  const directives: DocsDirectives = {};

  for (const comment of node.getLeadingCommentRanges()) {
    const matches = comment.getText().matchAll(DIRECTIVES_PATTERN);
    for (const match of matches) {
      const [_, name] = match;

      switch (name) {
        case "docs-expand-type-reference": {
          directives.expand_type_reference = true;
          break;
        }
        case "docs-skip": {
          directives.skip = true;
          break;
        }
      }
    }
  }

  return directives;
}

function is_keyword(node: TSM.Node): boolean {
  return (
    Node.isAnyKeyword(node)
    || Node.isInferKeyword(node)
    || Node.isNeverKeyword(node)
    || Node.isNumberKeyword(node)
    || Node.isObjectKeyword(node)
    || Node.isStringKeyword(node)
    || Node.isSymbolKeyword(node)
    || Node.isBooleanKeyword(node)
    || Node.isUndefinedKeyword(node)
  );
}

function render_method_signature(
  node: TSM.MethodSignature,
  { name }: { name: string },
) {
  // TODO: render param types
  // TODO: make types clickable
  const params = node
    .getChildrenOfKind(ts.SyntaxKind.Parameter)
    .map(param =>
      param
        .getChildAtIndexIfKindOrThrow(0, ts.SyntaxKind.Identifier)
        .getText() + (param.hasQuestionToken() ? "?" : "")
    )
    .join(", ");

  return `${name}(${params}): ${node.getReturnTypeNode()?.getText() ?? "void"}`;
}

function* traverse_further(
  node: Node,
  parents: ParentEntry[],
): Generator<TraverseEntry> {
  const parent = node.getParent();
  if (parent) {
    const directives = get_directives(parent);
    if (directives.expand_type_reference) {
      yield* traverse(node, parents);
      return;
    }
  }

  yield* traverse_children(node, parents);
}

function* traverse_children(
  node: Node,
  parents: ParentEntry[],
): Generator<TraverseEntry> {
  for (const child of children(node)) {
    yield* traverse(child, parents);
  }
}

function children(node: Node): Node[] {
  const nodes: Node[] = [];
  node.forEachChild(child => {
    nodes.push(child);
  });
  return nodes;
}

function* Docs(docs: TSM.JSDoc | undefined): Generator<TraverseEntry> {
  if (!docs) {
    return;
  }

  // if the docstring just contains tags like `@example`, or if there are no special annotations
  // then there will be no text nodes and the text we need will just be on the root node
  if (docs.getChildCount() === 0 || docs.getChildren().every((child) => Node.isJSDocTag(child))) {
    yield docs.getDescription();
  }

  for (const child of docs.getChildren()) {
    if (Node.isJSDocText(child)) {
      yield child.compilerNode.text;
    } else if (Node.isJSDocTag(child)) {
      yield "\n\n`ts:" + child.print().replaceAll("`", "\\`") + "`";
    } else if (Node.isJSDocLink(child)) {
      const name_node = child.getFirstChildIfKindOrThrow(TSM.SyntaxKind.QualifiedName);
      const Name = name_node.getText();

      yield `{% link href="#${Name}" class="go-to-def" %} \`ts:${Name}\`{% /link %}`;
    } else {
      throw new Error(`Unhandled JSDoc node kind: ${child.getKindName()}`);
    }
  }
}

interface IndexEntry {
  type: "index";
  kind: "property" | "method" | "namespace" | "type";
  id: string;
}

function generate_index(entries: IndexEntry[]): string {
  const lines: string[] = [];

  lines.push("{% html %}");
  lines.push("");
  lines.push("<br>");
  lines.push(html`
    <details class="index">
      <summary>Index</summary>
  `);
  lines.push("{% /html %}");
  lines.push("");

  for (const entry of entries) {
    const symbol = entry.kind === "method" ? `${entry.id}()` : entry.id;
    lines.push(`[\`${symbol}\`](#${entry.id})  `);
  }

  lines.push("");
  lines.push("{% html %}");
  lines.push(html`</details>`);
  lines.push("{% /html %}");
  lines.push("");

  return lines.join("\n");
}

main();
