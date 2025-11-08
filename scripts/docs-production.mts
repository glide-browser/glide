import fs from "fs/promises";
import { HTMLRewriter } from "html-rewriter-wasm";
import Path from "path";
import { DOCS_DIST_DIR } from "./canonical-paths.mts";

async function main() {
  for await (const html_file of fs.glob("**/*.html", { cwd: DOCS_DIST_DIR })) {
    console.log(html_file);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let output = "";
    const rewriter = new HTMLRewriter((outputChunk) => {
      output += decoder.decode(outputChunk);
    });

    rewriter.on("a", {
      element(element) {
        const href = element.getAttribute("href");
        if (!href || !href.includes(".html")) {
          return;
        }

        if (URL.canParse(href)) {
          // if the href is a fully formed URL, then it is an absolute URL, so we should leave it as-is
          return;
        }

        const new_url = ((): string | undefined => {
          const anchor_index = href.indexOf("#");
          if (anchor_index === -1) {
            return href.slice(0, -5);
          }

          const base = href.slice(0, anchor_index);
          const anchor = href.slice(anchor_index);
          if (base.endsWith(".html")) {
            return base.slice(0, -5) + anchor;
          }
        })();

        if (new_url) {
          element.setAttribute("href", new_url === "./index" ? "/" : new_url);
        }
      },
    });

    const absolute_path = Path.join(DOCS_DIST_DIR, html_file);

    try {
      await rewriter.write(encoder.encode(await fs.readFile(absolute_path, "utf8")));
      await rewriter.end();
      await fs.writeFile(absolute_path, output);
    } finally {
      rewriter.free();
    }
  }
}

await main();
