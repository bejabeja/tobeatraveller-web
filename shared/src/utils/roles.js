// Mirrors api/src/utils/roles.js's ROLES.ADMIN/ROLES.SUPERADMIN. Kept as a
// separate copy because api/ doesn't depend on shared/ (see CLAUDE.md), but
// client and mobile both need it, so it lives here instead of being
// redeclared in each of them.
export const SUPERADMIN_ROLE = "superadmin";
export const ADMIN_ROLES = ["admin", SUPERADMIN_ROLE];
