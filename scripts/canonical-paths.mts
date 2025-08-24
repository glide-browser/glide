import Path from "path";
import { fileURLToPath } from "url";

export const ROOT_DIR = Path.join(Path.dirname(fileURLToPath(import.meta.url)), "..");

export const ENGINE_DIR = Path.join(ROOT_DIR, "engine");

export const SRC_DIR = Path.join(ROOT_DIR, "src");

export const GLIDE_BROWSER_DIR = Path.join(SRC_DIR, "glide", "browser");
export const GLIDE_BROWSER_CONTENT_DIR = Path.join(GLIDE_BROWSER_DIR, "base", "content");

export const DOCS_DIR = Path.join(SRC_DIR, "glide", "docs");
export const DOCS_DIST_DIR = Path.join(DOCS_DIR, "dist");

export const TUTOR_DIR = Path.join(GLIDE_BROWSER_DIR, "components", "tutor");
