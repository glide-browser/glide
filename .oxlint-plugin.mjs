// @ts-check
// glide-plugin.js
import { definePlugin, defineRule } from "@oxlint/plugins";

const plugin = definePlugin({
  meta: {
    name: "glide",
  },
  rules: {
    "require-using-for-scoped-prefs": defineRule({
      meta: { type: "problem" },
      // @ts-expect-error weird TS type mismatch somehow :shrug:
      createOnce(context) {
        return {
          VariableDeclaration(node) {
            switch (node.kind) {
              case "using":
              case "await using": {
                return;
              }

              case "var":
              case "let":
              case "const": {
                break;
              }
            }

            for (const decl of node.declarations ?? []) {
              if (
                decl.init?.type === "CallExpression" && (
                  (decl.init.callee.type === "Identifier" && decl.init.callee.name === "scoped")
                  || (decl.init.callee.type === "MemberExpression"
                    && decl.init.callee.property.type === "Identifier"
                    && decl.init.callee.property.name === "scoped"
                    && decl.init.callee.object.type === "MemberExpression"
                    && decl.init.callee.object.property.type === "Identifier"
                    && decl.init.callee.object.property.name === "prefs")
                )
              ) {
                context.report({
                  node: decl,
                  message:
                    "Use `using prefs = glide.prefs.scoped()` instead of `const/let/var prefs = glide.prefs.scoped()`.",
                });
              }
            }
          },
        };
      },
    }),
  },
});

export default plugin;
