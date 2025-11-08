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

        const anchor_index = href.indexOf("#");
        const base = anchor_index === -1 ? href : href.slice(0, anchor_index);
        const anchor = anchor_index === -1 ? "" : href.slice(anchor_index);

        if (!base.endsWith(".html")) {
          return;
        }

        // prettify links, to match what cloudflare does
        let new_base = base.slice(0, -5);

        if (new_base === "./index") {
          new_base = "/";
        } else if (new_base.endsWith("/index")) {
          new_base = new_base.slice(0, -5);
        }

        element.setAttribute("href", new_base + anchor);
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
