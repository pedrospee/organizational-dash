/**
 * A resource that a use case needs does not exist. It carries a stable code
 * (e.g. ACCOUNT_NOT_FOUND) but no HTTP status: the HTTP layer maps it to 404.
 */
export class NotFoundError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "NotFoundError";
    this.code = code;
  }
}
