import { z } from "zod";

/**
 * A business date as `YYYY-MM-DD`. Only the shape is checked here; whether it is
 * a real calendar date (no 2026-02-30) is decided by @solvia/core's parseLocalDate.
 */
export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "must be a date formatted YYYY-MM-DD" });
