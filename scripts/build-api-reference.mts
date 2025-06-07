import "./polyfill-chromeutils.cjs";
import Path from "path";
import TSM from "ts-morph";
import { ts } from "ts-morph";
import { Project } from "ts-morph";
import {
  GLIDE_BROWSER_CONTENT_DIR,
  DOCS_DIR,
  ROOT_DIR,
} from "./canonical-paths.mts";
import { assert_present } from "../src/glide/browser/base/content/utils/guards.mts";
import assert from "assert";
import { Node } from "ts-morph";
import fs from "node:fs/promises";
import { markdown } from "../src/glide/browser/base/content/utils/dedent.mts";

const DISABLED_PROPERTIES = new Set([
  // we don't generate the overloads well right now
  "glide.autocmd",
]);

async function main() {
  const project = new Project({
    tsConfigFilePath: Path.join(ROOT_DIR, "tsconfig.json"),
  });
  const file = assert_present(
    project.getSourceFile(
      Path.join(GLIDE_BROWSER_CONTENT_DIR, "glide-api.d.ts")
    )
  );

  const global_decl = file.getFirstChildByKind(
    ts.SyntaxKind.ModuleDeclaration
  )!;
  assert.equal(global_decl?.getName(), "global");

  const inner = global_decl.getFirstChildByKind(ts.SyntaxKind.ModuleBlock);

  const output: string[] = [
    // we actually do want the headings to act as visual hierarchy here
    markdown`
      {% styles %}
      h1, h2 {
      font-size: revert !important;
      }
      {% /styles %}
    `,
    "\n",
  ];
  for (const text of traverse(inner!)) {
    output.push(text);
  }
  const content = output.join("");
  await fs.writeFile(Path.join(DOCS_DIR, "api.md"), content);
}

interface ParentEntry {
  name: string;
  node: Node;
}

function* traverse(node: Node, parents: ParentEntry[] = []): Generator<string> {
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

      yield* Header(`${QualifiedName}`, {
        parents,
        id: QualifiedName,
      });

      if (docs) {
        yield docs.getDescription();
      }

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
    const children = node.getChildrenOfKind(ts.SyntaxKind.PropertySignature);
    for (const signature of children) {
      yield* traverse(signature, parents);
    }

    return;
  }

  if (Node.isMethodSignature(node)) {
    const QualifiedName = [
      ...parents.map(({ name }) => name),
      node.getName(),
    ].join(".");

    yield "\n\n";
    yield `{% api-heading id="${QualifiedName}" %}\n`;
    yield render_method_signature(node, { name: QualifiedName }) + "\n";
    yield "{% /api-heading %}\n";
    yield "\n";

    const docs = node.getJsDocs()[0];
    if (docs) {
      yield docs.getDescription();
    }

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
      yield* Header(`${QualifiedName}: ${inner.getText()}`, {
        parents,
        id: QualifiedName,
      });

      if (docs) {
        yield docs.getDescription();
      }

      yield "\n";

      yield* traverse_further(inner, [...parents, { name: Name, node }]);

      return;
    }

    yield* Header(`${QualifiedName}`, {
      parents,
      id: QualifiedName,
    });

    if (docs) {
      yield docs.getDescription();
    }

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

    console.warn(
      "type reference with no TypeLiteral declaration is not supported"
    );
    return;
  }

  console.warn("unhandled TS Node:", node.getKindName());
}

function* Header(
  Code: string,
  { parents, id }: { parents: ParentEntry[]; id: string }
): Generator<string> {
  const Bullet = parents.length === 1 ? "• " : "";

  const HeaderHash = Array(parents.length + 2).join("#");

  yield `\n${HeaderHash} ${Bullet}\`${Code}\` {% id="${id}" %}\n`;
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
    Node.isAnyKeyword(node) ||
    Node.isInferKeyword(node) ||
    Node.isNeverKeyword(node) ||
    Node.isNumberKeyword(node) ||
    Node.isObjectKeyword(node) ||
    Node.isStringKeyword(node) ||
    Node.isSymbolKeyword(node) ||
    Node.isBooleanKeyword(node) ||
    Node.isUndefinedKeyword(node)
  );
}

function render_method_signature(
  node: TSM.MethodSignature,
  { name }: { name: string }
) {
  // TODO: render param types
  // TODO: make types clickable
  const params = node
    .getChildrenOfKind(ts.SyntaxKind.Parameter)
    .map(
      param =>
        param
          .getChildAtIndexIfKindOrThrow(0, ts.SyntaxKind.Identifier)
          .getText() + (param.hasQuestionToken() ? "?" : "")
    )
    .join(", ");

  return `${name}(${params}): ${node.getReturnTypeNode()?.getText() ?? "void"}`;
}

function* traverse_further(
  node: Node,
  parents: ParentEntry[]
): Generator<string> {
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
  parents: ParentEntry[]
): Generator<string> {
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

main();
