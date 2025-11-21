import { ConfigFlags } from "../../types/config.types";

export const defaultFlags = (): ConfigFlags => ({
  dryRun: false,
  verbose: false,
  force: false,
  interactive: false
});
