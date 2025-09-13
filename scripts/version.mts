import config from "../glider.json" with { type: "json" };

process.stdout.write(config.brands.glide.release.displayVersion);
