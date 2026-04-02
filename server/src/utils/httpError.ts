export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}

