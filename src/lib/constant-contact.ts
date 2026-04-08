/**
 * Constant Contact integration helpers.
 *
 * TODO: Implement actual Constant Contact API calls.
 * These stubs allow the build to pass while the integration is in progress.
 */

export async function isConnected(_officeId: string): Promise<boolean> {
  return false;
}

export function getAuthUrl(_officeId: string): string {
  throw new Error("Constant Contact integration not yet implemented");
}

export async function exchangeCode(_code: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  throw new Error("Constant Contact integration not yet implemented");
}

export async function storeTokens(_officeId: string, _accessToken: string, _refreshToken: string, _expiresIn: number): Promise<void> {
  throw new Error("Constant Contact integration not yet implemented");
}

export async function disconnect(_officeId: string): Promise<void> {
  throw new Error("Constant Contact integration not yet implemented");
}

export async function createContactList(
  _officeId: string,
  _listName: string
): Promise<string> {
  throw new Error("Constant Contact integration not yet implemented");
}

export async function upsertContacts(
  _officeId: string,
  _contacts: { email: string; first_name: string; last_name: string }[],
  _listId: string
): Promise<void> {
  throw new Error("Constant Contact integration not yet implemented");
}
