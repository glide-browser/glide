// @ts-check
// glide-plugin.js
import { definePlugin, defineRule } from "@oxlint/plugins";

const plugin = definePlugin({
  meta: {
    name: "glide",
  },
  rules: {
    "require-using-for-temp-prefs": defineRule({
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
                //
              }
            }

            for (const decl of node.declarations ?? []) {
              if (
                decl.init?.type === "CallExpression" && decl.init.callee.type === "Identifier"
                && decl.init.callee.name === "temp_prefs"
              ) {
                context.report({
                  node: decl,
                  message: "Use `using prefs = temp_prefs()` instead of `const/let/var prefs = temp_prefs()`.",
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
