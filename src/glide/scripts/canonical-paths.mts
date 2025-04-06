import Path from "path";
import { fileURLToPath } from "url";

export const SRC_DIR = Path.join(
  Path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);
export const ENGINE_DIR = Path.join(
  Path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "engine"
);
