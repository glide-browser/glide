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

// TODO:
//   - what output structure do I want? as in what data does this build up
//   - some sort of heirarchy setup

async function main() {
  const project = new Project({
    tsConfigFilePath: Path.join(ROOT_DIR, "tsconfig.json"),
  });
  const file = assert_present(
    project.getSourceFile(
      // Path.join(GLIDE_BROWSER_CONTENT_DIR, "glide-api-tmp.d.ts")
      Path.join(GLIDE_BROWSER_CONTENT_DIR, "glide-api.d.ts")
    )
  );

  const global_decl = file.getFirstChildByKind(
    ts.SyntaxKind.ModuleDeclaration
  )!;
  assert.equal(global_decl?.getName(), "global");

  const inner = global_decl.getFirstChildByKind(ts.SyntaxKind.ModuleBlock);

  const output: string[] = [
    markdown`
      {% styles %}
      h1, h2, h3, h4, h5 {
      font-size: revert !important;
      }
      {% /styles %}
    `,
  ];
  for (const text of traverse(inner!)) {
    output.push(text);
  }

  const content = output.join("");

  await fs.writeFile(Path.join(DOCS_DIR, "api-generated.md"), content);
}

// TODO: rename
interface Parent {
  name: string;
  node: Node;
}

function* traverse(node: Node, parents: Parent[] = []): Generator<string> {
  // note: we assume everything is exported

  const Header = Array(parents.length + 2).join("#");

  if (Node.isModuleBlock(node)) {
    yield* traverse_children(node, parents);
    return;
  }

  if (Node.isVariableStatement(node)) {
    const docs = node.getJsDocs()[0];

    for (const declaration of node.getDeclarations()) {
      const name = [
        ...parents.map(({ name }) => name),
        declaration.getName(),
      ].join(".");

      yield `\n${Header} \`${name}\` {% id="${name}" %}\n`;

      if (docs) {
        yield docs.getDescription();
      }

      // yield separator;

      yield* traverse_children(declaration, [
        ...parents,
        { name: declaration.getName(), node: declaration },
      ]);
    }

    return;
  }

  if (Node.isTypeLiteral(node)) {
    const children = node.getChildrenOfKind(ts.SyntaxKind.PropertySignature);
    for (const signature of children) {
      yield* traverse(signature, parents);
    }

    return;
  }

  if (Node.isMethodSignature(node)) {
    const name = [...parents.map(({ name }) => name), node.getName()].join(".");

    yield "\n\n";
    yield `{% api-heading id="${name}" %}\n`;
    yield render_method_signature(node, { name }) + "\n";
    yield "{% /api-heading %}\n";
    yield "\n";

    // TODO: multiple?
    const docs = node.getJsDocs()[0];
    if (docs) {
      yield docs.getDescription();
    }

    return;
  }

  if (Node.isPropertySignature(node)) {
    const ident = node.getFirstChildByKindOrThrow(ts.SyntaxKind.Identifier);
    const inner = children(node)[1]!;

    const docs = node.getJsDocs()[0];
    const name = [...parents.map(({ name }) => name), ident.getText()].join(
      "."
    );

    if (name === "glide.autocmd") {
      // TODO
      return;
    }

    if (is_keyword(inner) || Node.isTypeReference(inner)) {
      yield `\n${Header} \`${name}: ${inner.getText()}\` {% id="${name}" %}\n`;

      if (docs) {
        yield docs.getDescription();
      }

      yield "\n";

      yield* traverse_children(inner, [
        ...parents,
        { name: ident.getText(), node },
      ]);

      return;
    }

    yield `\n${Header} \`${name}\` {% id="${name}" %}\n`;

    if (docs) {
      yield docs.getDescription();
    }

    yield* traverse_children(inner, [
      ...parents,
      { name: ident.getText(), node },
    ]);
    // yield separator;
    return;
  }

  console.log(node.print());
  console.warn("unhandled kind", node.getKindName());
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

const separator = "\n\n---\n\n";

function* traverse_children(node: Node, parents: Parent[]): Generator<string> {
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
