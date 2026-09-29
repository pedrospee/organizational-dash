import type { MoneyJson } from "@solvia/contracts";
import { createMoney, type Money } from "@solvia/core";

// amountMinor travels as a string (ADR-0003); BigInt() never passes through a number.

export function moneyFromJson(json: MoneyJson): Money {
  return createMoney(BigInt(json.amountMinor), json.currency);
}

export function moneyToJson(money: Money): MoneyJson {
  return { amountMinor: money.amountMinor.toString(), currency: money.currency };
}
