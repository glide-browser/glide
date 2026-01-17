import config from "../firefox.json" with { type: "json" };

process.stdout.write(config.brands.glide.release.display_version);
