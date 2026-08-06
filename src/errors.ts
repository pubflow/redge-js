export interface RedgeErrorOptions {
  status?: number;
  code?: string;
  message: string;
  details?: unknown;
  cause?: unknown;
}

export class RedgeError extends Error {
  readonly status?: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(options: RedgeErrorOptions) {
    super(options.message);
    this.name = "RedgeError";
    this.status = options.status;
    this.code = options.code ?? "REDGE_ERROR";
    this.details = options.details;
    if (options.cause !== undefined) {
      Object.defineProperty(this, "cause", { value: options.cause });
    }
  }
}

export function isRedgeError(error: unknown): error is RedgeError {
  return error instanceof RedgeError;
}
