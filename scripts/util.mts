import { Stats } from "fs";
import fs from "fs/promises";
import Path from "path";

export async function exists(path: string): Promise<boolean> {
  return await fs.access(path).then(() => true).catch(() => false);
}

export async function does_not_exist(path: string) {
  return !(await exists(path));
}

export async function ensure_symlink(src: string, dest: string) {
  if (!Path.isAbsolute(src)) {
    throw new Error("The src path must be absolute");
  }

  const stats = await fs.lstat(dest).catch(() => undefined);

  if (stats && stats.isSymbolicLink()) {
    const [src_stat, dst_stat] = await Promise.all([
      fs.stat(src),
      fs.stat(dest),
    ]);

    if (are_identical(src_stat, dst_stat)) {
      return;
    }
  }

  const dir = Path.dirname(dest);
  if (await does_not_exist(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
  return fs.symlink(src, dest);
}

function are_identical(src_stat: Stats, dest_stat: Stats) {
  return dest_stat.ino !== undefined && dest_stat.dev !== undefined && dest_stat.ino === src_stat.ino
    && dest_stat.dev === src_stat.dev;
}
