export interface CommandOptions {
  cwd?: string;
  args: string[];
  flags?: Record<string, string | boolean | number | undefined>;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export type CommandHandler<T = unknown> = (options: CommandOptions) => Promise<CommandResult<T>> | CommandResult<T>;
