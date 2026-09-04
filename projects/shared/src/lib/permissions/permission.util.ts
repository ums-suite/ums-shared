/**
 * Pure permission-check helpers against an explicit, already-resolved set of granted permission
 * keys (the `<owning-module>.<resource>.<action>` strings `UMS.Shared.Authorization.
 * PermissionDefinition.Key` defines, e.g. `"identity.role.manage"`, `"organization.faculty.
 * write"`) -- these never reach into a JWT or make a network call themselves, by design (see
 * README "Known gap: permission resolution" for why a JWT-only check isn't possible today).
 *
 * A consuming app obtains its `grantedPermissions` list however its own screen needs to (e.g. an
 * admin-role-management screen that already called `GET /api/v1/identity/permissions` and cross-
 * references it against a Role's `GET /api/v1/identity/roles/{id}` permission set) and passes it
 * in here for a single, consistent evaluation rule platform-wide -- exactly the kind of tiny,
 * repeated-everywhere logic ADR-0017 charters `ums-shared` to hold so no app reinvents it.
 */
export function hasPermission(grantedPermissions: readonly string[], required: string): boolean {
  return grantedPermissions.includes(required);
}

export function hasAnyPermission(
  grantedPermissions: readonly string[],
  required: readonly string[],
): boolean {
  return required.some((permission) => grantedPermissions.includes(permission));
}

export function hasAllPermissions(
  grantedPermissions: readonly string[],
  required: readonly string[],
): boolean {
  return required.every((permission) => grantedPermissions.includes(permission));
}
