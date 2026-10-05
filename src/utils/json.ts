import type { z } from 'zod';

export class DataIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataIntegrityError';
  }
}

/** Parses a JSON column and validates it, failing loudly instead of letting bad data reach the UI. */
export function parseJsonColumn<S extends z.ZodType>(schema: S, value: string | null, column: string): z.infer<S> {
  let raw: unknown;
  try {
    raw = value === null ? null : JSON.parse(value);
  } catch {
    throw new DataIntegrityError(`Column "${column}" contains invalid JSON`);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new DataIntegrityError(`Column "${column}" failed validation: ${result.error.message}`);
  }
  return result.data;
}

export const toJson = (value: unknown): string => JSON.stringify(value);
