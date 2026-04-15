import pino from "pino";

export type Logger = pino.Logger;

export function createLogger(service: string): Logger {
  return pino({
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}
