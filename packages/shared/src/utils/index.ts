import { randomUUID } from "crypto";

export function generateId(): string {
  return randomUUID();
}

export function toTimestamp(date: Date): string {
  return date.toISOString();
}

export function assertUnreachable(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}
