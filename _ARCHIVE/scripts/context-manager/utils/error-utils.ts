export class ContextManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContextManagerError";
  }
}

export const toError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }
  return new ContextManagerError(String(value));
};
