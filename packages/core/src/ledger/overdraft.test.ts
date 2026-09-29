import { describe, expect, it } from "vitest";
import { formatMoney, type Money } from "../money/money.ts";
import {
  type AccountKind,
  ASSET_ACCOUNT_KINDS,
  createAccount,
  LIABILITY_ACCOUNT_KINDS,
} from "./account.ts";
import { calculateAccountBalance } from "./balances.ts";
import { calculateOverdraft } from "./overdraft.ts";
import { brl, demoCreditCard, demoDate, demoWiseEur, eur, foodCategory } from "./test-fixtures.ts";
import {
  createExpenseTransaction,
  createOpeningBalanceTransaction,
} from "./transaction-factories.ts";
import { assertValidTransaction } from "./transaction-validation.ts";

function bankEur(overdraftLimit?: Money) {
  return createAccount({
    id: "demo-bank-overdraft",
    name: "Demo Bank with overdraft",
    kind: "BANK",
    currency: "EUR",
    ...(overdraftLimit ? { overdraftLimit } : {}),
  });
}

function openingBalance(account: ReturnType<typeof bankEur>, balance: string) {
  return createOpeningBalanceTransaction({
    id: "t-opening",
    date: demoDate,
    description: "Opening balance",
    account,
    balance: eur(balance),
  });
}

function formatted(overdraft: ReturnType<typeof calculateOverdraft>) {
  if (overdraft === null) {
    return null;
  }
  return {
    limit: formatMoney(overdraft.limit),
    used: formatMoney(overdraft.used),
    remaining: formatMoney(overdraft.remaining),
    exceeded: formatMoney(overdraft.exceeded),
    availableIncludingOverdraft: formatMoney(overdraft.availableIncludingOverdraft),
  };
}

describe("overdraft limit on an account (BR-22)", () => {
  it("is accepted on a BANK account, in the account's currency, above zero", () => {
    expect(bankEur(eur("500.00")).overdraftLimit).toEqual(eur("500.00"));
  });

  it("is optional: an account without a limit has no overdraft limit", () => {
    expect(bankEur().overdraftLimit).toBeUndefined();
  });

  it("is rejected on every account kind other than BANK", () => {
    const otherKinds: AccountKind[] = [
      ...ASSET_ACCOUNT_KINDS.filter((kind) => kind !== "BANK"),
      ...LIABILITY_ACCOUNT_KINDS,
    ];

    for (const kind of otherKinds) {
      expect(() =>
        createAccount({
          id: "a",
          name: "Demo",
          kind,
          currency: "EUR",
          overdraftLimit: eur("500.00"),
        }),
      ).toThrowError(expect.objectContaining({ code: "INVALID_ACCOUNT" }));
    }
  });

  it("is rejected when zero or negative: no limit is expressed by leaving it out", () => {
    expect(() => bankEur(eur("0.00"))).toThrowError(
      expect.objectContaining({ code: "INVALID_ACCOUNT" }),
    );
    expect(() => bankEur(eur("-500.00"))).toThrowError(
      expect.objectContaining({ code: "INVALID_ACCOUNT" }),
    );
  });

  it("is rejected in a currency other than the account's", () => {
    expect(() => bankEur(brl("500.00"))).toThrowError(
      expect.objectContaining({ code: "INVALID_ACCOUNT" }),
    );
  });
});

describe("calculateOverdraft (BR-22)", () => {
  const account = bankEur(eur("500.00"));

  it.each([
    {
      balance: "200.00",
      expected: { used: "0.00", remaining: "500.00", exceeded: "0.00", available: "700.00" },
    },
    {
      balance: "0.00",
      expected: { used: "0.00", remaining: "500.00", exceeded: "0.00", available: "500.00" },
    },
    {
      balance: "-150.00",
      expected: { used: "150.00", remaining: "350.00", exceeded: "0.00", available: "350.00" },
    },
    {
      balance: "-500.00",
      expected: { used: "500.00", remaining: "0.00", exceeded: "0.00", available: "0.00" },
    },
    {
      balance: "-600.00",
      expected: { used: "600.00", remaining: "0.00", exceeded: "100.00", available: "0.00" },
    },
  ])(
    "derives used, remaining, exceeded and available at a balance of €$balance",
    ({ balance, expected }) => {
      const ledger = balance === "0.00" ? [] : [openingBalance(account, balance)];

      expect(formatted(calculateOverdraft(account, ledger))).toEqual({
        limit: "EUR 500.00",
        used: `EUR ${expected.used}`,
        remaining: `EUR ${expected.remaining}`,
        exceeded: `EUR ${expected.exceeded}`,
        availableIncludingOverdraft: `EUR ${expected.available}`,
      });
    },
  );

  it("is null for an account without a limit, while the ledger still shows the negative balance", () => {
    const account = bankEur();
    const ledger = [openingBalance(account, "-500.00")];

    expect(calculateOverdraft(account, ledger)).toBeNull();
    expect(formatMoney(calculateAccountBalance(account, ledger))).toBe("EUR -500.00");
  });

  it("is null for accounts that cannot have a limit", () => {
    expect(calculateOverdraft(demoWiseEur, [])).toBeNull();
    expect(calculateOverdraft(demoCreditCard, [])).toBeNull();
  });

  it("never blocks the ledger: an expense beyond the limit is recorded and shows as exceeded", () => {
    const opening = openingBalance(account, "-450.00");
    const expense = createExpenseTransaction({
      id: "t-beyond-limit",
      date: demoDate,
      description: "Groceries",
      paidFrom: account,
      category: foodCategory,
      amount: eur("80.00"),
    });

    expect(() =>
      assertValidTransaction(expense, { accounts: [account], categories: [foodCategory] }),
    ).not.toThrow();
    expect(formatted(calculateOverdraft(account, [opening, expense]))).toMatchObject({
      used: "EUR 530.00",
      remaining: "EUR 0.00",
      exceeded: "EUR 30.00",
      availableIncludingOverdraft: "EUR 0.00",
    });
  });
});
