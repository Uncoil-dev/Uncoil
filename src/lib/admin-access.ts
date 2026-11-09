import { BUILT_IN_ADMIN_EMAILS } from "convex/adminAccess";

/**
 * Bootstrap administrators for the private content workspace.
 *
 * Additional people and organizations can be granted access through the
 * UNCOIL_LIBRARY_* environment variables in library-access.ts.
 */
export const DASHBOARD_ADMIN_EMAILS = new Set(BUILT_IN_ADMIN_EMAILS);
