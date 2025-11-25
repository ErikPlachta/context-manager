export const logInfo = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[context-manager] ${message}`);
};

export const logWarn = (message: string): void => {
  // eslint-disable-next-line no-console
  console.warn(`[context-manager] ${message}`);
};

export const logError = (message: string): void => {
  // eslint-disable-next-line no-console
  console.error(`[context-manager] ${message}`);
};
