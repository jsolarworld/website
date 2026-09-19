/** Who can do what (PRD section 8). Owner can do everything. */
export const STAFF_ROLES = ["OWNER", "STORE_MANAGER", "SALES_REP", "CONTENT_EDITOR"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type Permission =
  | "catalogue:read"
  | "catalogue:write"
  | "packages:approve"
  | "orders:read"
  | "orders:write"
  | "leads:read"
  | "leads:write"
  | "delivery:write"
  | "content:write"
  | "settings:write"
  | "staff:manage"
  | "audit:read";

const ALL: Permission[] = [
  "catalogue:read",
  "catalogue:write",
  "packages:approve",
  "orders:read",
  "orders:write",
  "leads:read",
  "leads:write",
  "delivery:write",
  "content:write",
  "settings:write",
  "staff:manage",
  "audit:read",
];

const MATRIX: Record<StaffRole, Permission[]> = {
  OWNER: ALL,
  STORE_MANAGER: ["catalogue:read", "catalogue:write", "packages:approve", "orders:read", "orders:write", "delivery:write"],
  SALES_REP: ["catalogue:read", "orders:read", "orders:write", "leads:read", "leads:write"],
  CONTENT_EDITOR: ["catalogue:read", "content:write"],
};

export const isStaffRole = (r: unknown): r is StaffRole => STAFF_ROLES.includes(r as StaffRole);

export const can = (role: StaffRole, permission: Permission) => MATRIX[role].includes(permission);

export const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: "Owner",
  STORE_MANAGER: "Store manager",
  SALES_REP: "Sales rep",
  CONTENT_EDITOR: "Content editor",
};
