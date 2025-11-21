import { ConfigDefaults } from "../../types/config.defaults.types";

export const configDefaults: ConfigDefaults = {
  rootDir: ".",
  templateDir: ".github",
  docsDir: ".docs",
  paths: {
    templates: ".bin/templates",
    docs: ".docs",
    bin: ".bin",
    cache: ".cache"
  },
  flags: {
    dryRun: false,
    verbose: false,
    force: false,
    interactive: false
  }
};
