// Fictitious accounts and categories for tests. Never put real data here.
import { parseLocalDate } from "../local-date.ts";
import { type Money, moneyFromDecimal } from "../money/money.ts";
import { createAccount } from "./account.ts";
import { createCategory } from "./category.ts";

export const demoBankEur = createAccount({
  id: "demo-bank-eur",
  name: "Demo Bank",
  institution: "Example Bank",
  kind: "BANK",
  currency: "EUR",
});

export const demoWiseEur = createAccount({
  id: "demo-wise-eur",
  name: "Demo Wise EUR",
  institution: "Example Transfer Service",
  kind: "WISE",
  currency: "EUR",
});

export const demoWiseBrl = createAccount({
  id: "demo-wise-brl",
  name: "Demo Wise BRL",
  institution: "Example Transfer Service",
  kind: "WISE",
  currency: "BRL",
});

export const demoCreditCard = createAccount({
  id: "demo-credit-card",
  name: "Demo Credit Card",
  institution: "Example Bank",
  kind: "CREDIT_CARD",
  currency: "EUR",
});

export const salaryCategory = createCategory({ id: "salary", name: "Salary", nature: "INCOME" });
export const foodCategory = createCategory({ id: "food", name: "Food", nature: "EXPENSE" });
export const feesCategory = createCategory({ id: "fees", name: "Fees", nature: "EXPENSE" });

export const allDemoAccounts = [demoBankEur, demoWiseEur, demoWiseBrl, demoCreditCard];
export const allDemoCategories = [salaryCategory, foodCategory, feesCategory];

export const demoDate = parseLocalDate("2026-09-15");
export const demoRecordedAt = "2026-09-15T12:00:00Z";

export function eur(amount: string): Money {
  return moneyFromDecimal(amount, "EUR");
}

export function brl(amount: string): Money {
  return moneyFromDecimal(amount, "BRL");
}
