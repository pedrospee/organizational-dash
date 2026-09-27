import { DomainError } from "./domain-error.ts";

/**
 * A calendar date without time or time zone, formatted `YYYY-MM-DD`.
 * Financial periods (statements, months) are decided by local dates only.
 * The format sorts correctly as a plain string.
 */
export type LocalDate = string & { readonly __brand: "LocalDate" };

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDate(value: string): LocalDate {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) {
    throw new DomainError("INVALID_DATE", `Date must use the YYYY-MM-DD format, got "${value}".`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealCalendarDate =
    date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;

  if (!isRealCalendarDate) {
    throw new DomainError("INVALID_DATE", `"${value}" is not a real calendar date.`);
  }

  return value as LocalDate;
}
