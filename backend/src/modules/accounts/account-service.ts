import { randomUUID } from "node:crypto";
import { type Account, createAccount, type Money } from "@solvia/core";
import { NotFoundError } from "../errors.ts";
import type { AccountRecord, AccountRepository } from "./account-repository.ts";

export type NewAccount = Omit<Account, "id">;

/** A field left out stays unchanged; `null` removes an optional field. */
export type AccountChanges = Readonly<{
  name?: string;
  institution?: string | null;
  overdraftLimit?: Money | null;
}>;

export type AccountService = ReturnType<typeof createAccountService>;

/**
 * Account use cases. Every account that is written goes through the core's
 * createAccount, which owns the financial rules (BR-22). Archiving is a
 * lifecycle change only: it never touches the ledger.
 */
export function createAccountService(
  repository: AccountRepository,
  options: { now?: () => Date; newId?: () => string } = {},
) {
  const now = () => (options.now ?? (() => new Date()))().toISOString();
  const newId = options.newId ?? randomUUID;

  function load(id: string): AccountRecord {
    const record = repository.findById(id);
    if (record === undefined) {
      throw new NotFoundError("ACCOUNT_NOT_FOUND", `No account with id "${id}".`);
    }
    return record;
  }

  function save(current: AccountRecord, changes: Partial<AccountRecord>): AccountRecord {
    const record = { ...current, ...changes, updatedAt: now() };
    repository.update(record);
    return record;
  }

  return {
    list(options: { includeArchived: boolean }): AccountRecord[] {
      return repository.list(options);
    },

    get: load,

    create(input: NewAccount): AccountRecord {
      const account = createAccount({ ...input, id: newId() });
      const timestamp = now();
      const record = { account, archivedAt: null, createdAt: timestamp, updatedAt: timestamp };
      repository.insert(record);
      return record;
    },

    update(id: string, changes: AccountChanges): AccountRecord {
      const current = load(id);
      return save(current, { account: createAccount(applyChanges(current.account, changes)) });
    },

    /** Archiving an archived account changes nothing. */
    archive(id: string): AccountRecord {
      const current = load(id);
      return current.archivedAt === null ? save(current, { archivedAt: now() }) : current;
    },

    unarchive(id: string): AccountRecord {
      const current = load(id);
      return current.archivedAt === null ? current : save(current, { archivedAt: null });
    },

    delete(id: string): void {
      load(id);
      repository.delete(id);
    },
  };
}

function applyChanges(account: Account, changes: AccountChanges): Account {
  const { institution, overdraftLimit, ...fixed } = account;
  const nextInstitution =
    changes.institution === undefined ? institution : (changes.institution ?? undefined);
  const nextLimit =
    changes.overdraftLimit === undefined ? overdraftLimit : (changes.overdraftLimit ?? undefined);

  return {
    ...fixed,
    ...(changes.name === undefined ? {} : { name: changes.name }),
    ...(nextInstitution === undefined ? {} : { institution: nextInstitution }),
    ...(nextLimit === undefined ? {} : { overdraftLimit: nextLimit }),
  };
}
