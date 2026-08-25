import { MOCK_CURRENT_USER } from './data';

/**
 * Mock-only demo accounts (NOT real business data — there is no confirmed
 * backend yet). Kept separate from `authService` itself so the service can
 * be pointed at a real repository/API later by swapping this module only.
 */
export interface MockAccount {
  email: string;
  password: string;
}

export const MOCK_ACCOUNTS: MockAccount[] = [{ email: MOCK_CURRENT_USER.email, password: 'Manara@123' }];

/** Mimics a lookup a real repository/API would perform. */
export function findMockAccountByEmail(email: string): MockAccount | undefined {
  return MOCK_ACCOUNTS.find((account) => account.email.toLowerCase() === email.toLowerCase());
}

/**
 * Registers a new mock account (used by external registration) so the
 * account can log back in later through the same shared `/login` flow —
 * external registration isn't a dead-end, separate credential store.
 */
export function addMockAccount(account: MockAccount): void {
  if (findMockAccountByEmail(account.email)) return;
  MOCK_ACCOUNTS.push(account);
}
