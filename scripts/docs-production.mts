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
        if (!href || !href.endsWith(".html")) {
          return;
        }

        if (!URL.canParse(href)) {
          // if the href is not a fully formed URL, then it must be a relative URL
          // so we can safely strip the `.html` extension to use cloudflare's prettier URLs
          element.setAttribute("href", href.slice(0, -5));
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
