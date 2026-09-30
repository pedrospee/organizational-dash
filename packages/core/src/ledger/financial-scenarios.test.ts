// End-to-end financial rules from the project requirements (§36) and business rules.
import { describe, expect, it } from "vitest";
import { convertMoney, createExchangeRate } from "../exchange/exchange-rate.ts";
import { formatMoney } from "../money/money.ts";
import { calculateAccountBalance, summarizeIncomeAndExpense } from "./balances.ts";
import {
  allDemoCategories,
  brl,
  demoBankEur,
  demoCreditCard,
  demoDate,
  demoRecordedAt,
  demoWiseBrl,
  demoWiseEur,
  eur,
  feesCategory,
  foodCategory,
  salaryCategory,
} from "./test-fixtures.ts";
import {
  createCardPaymentTransaction,
  createConversionTransaction,
  createExpenseTransaction,
  createIncomeTransaction,
  createOpeningBalanceTransaction,
  createTransferTransaction,
} from "./transaction-factories.ts";

const bankOpening = createOpeningBalanceTransaction({
  id: "t-opening-bank",
  date: demoDate,
  description: "Opening balance",
  account: demoBankEur,
  balance: eur("1000.00"),
});

function balanceOf(
  account: typeof demoBankEur,
  transactions: Parameters<typeof calculateAccountBalance>[1],
) {
  return formatMoney(calculateAccountBalance(account, transactions));
}

function eurIncomeAndExpense(transactions: Parameters<typeof calculateAccountBalance>[1]) {
  const { income, expense } = summarizeIncomeAndExpense(transactions, allDemoCategories, "EUR");
  return { income: formatMoney(income), expense: formatMoney(expense) };
}

describe("internal transfer (BR-21)", () => {
  it("moves €300 from A to B without income, expense or change in total assets", () => {
    const transfer = createTransferTransaction({
      id: "t-transfer",
      date: demoDate,
      description: "Move to Wise",
      from: demoBankEur,
      to: demoWiseEur,
      amount: eur("300.00"),
    });
    const ledger = [bankOpening, transfer];

    const balanceA = calculateAccountBalance(demoBankEur, ledger);
    const balanceB = calculateAccountBalance(demoWiseEur, ledger);

    expect(formatMoney(balanceA)).toBe("EUR 700.00");
    expect(formatMoney(balanceB)).toBe("EUR 300.00");
    expect(balanceA.amountMinor + balanceB.amountMinor).toBe(eur("1000.00").amountMinor);
    expect(eurIncomeAndExpense(ledger)).toEqual({ income: "EUR 0.00", expense: "EUR 0.00" });
  });
});

describe("credit card purchase (BR-40)", () => {
  it("creates €500 of card debt and leaves the bank balance untouched", () => {
    const purchase = createExpenseTransaction({
      id: "t-card-purchase",
      date: demoDate,
      description: "Groceries",
      paidFrom: demoCreditCard,
      category: foodCategory,
      amount: eur("500.00"),
    });
    const ledger = [bankOpening, purchase];

    expect(balanceOf(demoBankEur, ledger)).toBe("EUR 1000.00");
    expect(balanceOf(demoCreditCard, ledger)).toBe("EUR 500.00");
    expect(eurIncomeAndExpense(ledger)).toEqual({ income: "EUR 0.00", expense: "EUR 500.00" });
  });
});

describe("credit card payment (BR-33)", () => {
  it("pays €500 of card debt: bank decreases, debt decreases, no new expense", () => {
    const cardOpening = createOpeningBalanceTransaction({
      id: "t-opening-card",
      date: demoDate,
      description: "Opening card debt",
      account: demoCreditCard,
      balance: eur("500.00"),
    });
    const payment = createCardPaymentTransaction({
      id: "t-card-payment",
      date: demoDate,
      description: "Card statement payment",
      from: demoBankEur,
      card: demoCreditCard,
      amount: eur("500.00"),
    });
    const ledger = [bankOpening, cardOpening, payment];

    expect(balanceOf(demoBankEur, ledger)).toBe("EUR 500.00");
    expect(balanceOf(demoCreditCard, ledger)).toBe("EUR 0.00");
    expect(eurIncomeAndExpense(ledger)).toEqual({ income: "EUR 0.00", expense: "EUR 0.00" });
  });
});

describe("currency conversion (BR-13, BR-16, BR-18)", () => {
  it("values BRL 1,000 at EUR/BRL 6 as EUR 166.67 and keeps the BRL amount", () => {
    const original = brl("1000.00");
    const rate = createExchangeRate({
      baseCurrency: "EUR",
      quoteCurrency: "BRL",
      rate: "6",
      effectiveDate: demoDate,
      source: "MANUAL",
      recordedAt: demoRecordedAt,
    });

    expect(formatMoney(convertMoney(original, rate, "EUR"))).toBe("EUR 166.67");
    expect(formatMoney(original)).toBe("BRL 1000.00");
  });

  it("records €100 → R$600 with a €1 fee: no income, only the fee as expense", () => {
    const conversion = createConversionTransaction({
      id: "t-conversion",
      date: demoDate,
      description: "EUR to BRL",
      from: demoBankEur,
      to: demoWiseBrl,
      sentAmount: eur("100.00"),
      receivedAmount: brl("600.00"),
      fee: { category: feesCategory, amount: eur("1.00") },
      recordedAt: demoRecordedAt,
    });
    const ledger = [bankOpening, conversion];

    expect(balanceOf(demoBankEur, ledger)).toBe("EUR 899.00");
    expect(balanceOf(demoWiseBrl, ledger)).toBe("BRL 600.00");
    expect(eurIncomeAndExpense(ledger)).toEqual({ income: "EUR 0.00", expense: "EUR 1.00" });
    expect(summarizeIncomeAndExpense(ledger, allDemoCategories, "BRL").income.amountMinor).toBe(0n);
    expect(conversion.exchangeRate).toMatchObject({
      baseCurrency: "EUR",
      quoteCurrency: "BRL",
      rate: "6",
      source: "TRANSACTION",
      recordedAt: demoRecordedAt,
    });
  });
});

describe("foreign-currency purchase (BR-15)", () => {
  it("keeps the original BRL expense and the EUR amount actually charged", () => {
    const purchase = createExpenseTransaction({
      id: "t-foreign-purchase",
      date: demoDate,
      description: "Dinner in São Paulo",
      paidFrom: demoCreditCard,
      category: foodCategory,
      amount: brl("120.00"),
      foreignCharge: { chargedAmount: eur("20.40"), recordedAt: demoRecordedAt },
    });

    expect(balanceOf(demoCreditCard, [purchase])).toBe("EUR 20.40");
    expect(
      formatMoney(summarizeIncomeAndExpense([purchase], allDemoCategories, "BRL").expense),
    ).toBe("BRL 120.00");
    expect(purchase.exchangeRate?.rate).toBe("5.882353");
  });
});

describe("income and overdraft", () => {
  it("records salary as income that increases the bank balance", () => {
    const salary = createIncomeTransaction({
      id: "t-salary",
      date: demoDate,
      description: "September salary",
      account: demoBankEur,
      category: salaryCategory,
      amount: eur("2500.00"),
    });
    const ledger = [bankOpening, salary];

    expect(balanceOf(demoBankEur, ledger)).toBe("EUR 3500.00");
    expect(eurIncomeAndExpense(ledger)).toEqual({ income: "EUR 2500.00", expense: "EUR 0.00" });
  });

  it("represents overdraft as a negative bank balance, not a separate liability", () => {
    const overdrawnOpening = createOpeningBalanceTransaction({
      id: "t-opening-overdraft",
      date: demoDate,
      description: "Opening balance",
      account: demoBankEur,
      balance: eur("-500.00"),
    });

    expect(balanceOf(demoBankEur, [overdrawnOpening])).toBe("EUR -500.00");
  });
});
