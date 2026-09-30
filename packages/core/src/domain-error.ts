export type DomainErrorCode =
  | "INVALID_DATE"
  | "INVALID_DECIMAL"
  | "INVALID_AMOUNT"
  | "CURRENCY_MISMATCH"
  | "INVALID_EXCHANGE_RATE"
  | "EXCHANGE_RATE_NOT_FOUND"
  | "INVALID_ACCOUNT"
  | "INVALID_CATEGORY"
  | "UNBALANCED_TRANSACTION"
  | "INVALID_TRANSACTION";

/**
 * A violated financial rule. The code is stable and meant for programmatic
 * handling (the API maps it to HTTP 422); the message is for humans.
 */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
