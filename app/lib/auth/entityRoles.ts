export type EntityRole = "admin" | "editor" | "viewer" | "employee";
export type EntityType = "district" | "nonprofit" | "business";

export interface EntityUser {
  entity_type?: EntityType;
  entity_id: string;
  user_id: string;
  role: EntityRole;
}

/**
 * Returns true if the user has one of the allowed roles for the given entity.
 */
export function hasEntityRole(
  entityUsers: EntityUser[] | undefined | null,
  entityType: EntityType,
  entityId: string,
  allowedRoles: EntityRole[],
): boolean {
  if (!entityUsers || !entityId) return false;
  return entityUsers.some(
    (eu) =>
      (!eu.entity_type || eu.entity_type === entityType) &&
      eu.entity_id === entityId &&
      allowedRoles.includes(eu.role),
  );
}

/**
 * Convenience helper for admin-only checks.
 */
export function isEntityAdmin(
  entityUsers: EntityUser[] | undefined | null,
  entityType: EntityType,
  entityId: string,
): boolean {
  return hasEntityRole(entityUsers, entityType, entityId, ["admin"]);
}
