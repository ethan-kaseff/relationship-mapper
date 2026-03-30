/**
 * Constant Contact integration helpers.
 *
 * TODO: Implement actual Constant Contact API calls.
 * These stubs allow the build to pass while the integration is in progress.
 */

export async function isConnected(_officeId: string): Promise<boolean> {
  return false;
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
