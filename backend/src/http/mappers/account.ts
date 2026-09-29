import type {
  AccountResponse,
  CreateAccountRequest,
  UpdateAccountRequest,
} from "@solvia/contracts";
import type { AccountRecord } from "../../modules/accounts/account-repository.ts";
import type { AccountChanges, NewAccount } from "../../modules/accounts/account-service.ts";
import { moneyFromJson, moneyToJson } from "./money.ts";

export function newAccountFromJson(json: CreateAccountRequest): NewAccount {
  const { overdraftLimit, ...rest } = json;
  return {
    ...rest,
    ...(overdraftLimit === undefined ? {} : { overdraftLimit: moneyFromJson(overdraftLimit) }),
  };
}

export function accountChangesFromJson(json: UpdateAccountRequest): AccountChanges {
  const { overdraftLimit, ...rest } = json;
  return {
    ...rest,
    ...(overdraftLimit === undefined
      ? {}
      : { overdraftLimit: overdraftLimit === null ? null : moneyFromJson(overdraftLimit) }),
  };
}

export function accountToJson({
  account,
  archivedAt,
  createdAt,
  updatedAt,
}: AccountRecord): AccountResponse {
  return {
    id: account.id,
    name: account.name,
    institution: account.institution ?? null,
    kind: account.kind,
    currency: account.currency,
    overdraftLimit:
      account.overdraftLimit === undefined ? null : moneyToJson(account.overdraftLimit),
    archivedAt,
    createdAt,
    updatedAt,
  };
}
