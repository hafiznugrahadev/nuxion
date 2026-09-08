/** Fields every persisted entity carries — mirrors BE `BaseEntity` (SPEC DRY #1). */
export interface BaseModel {
  id: string;
  createdAt: string; // ISO-8601 over the wire
  updatedAt: string;
}

/** A role is data (DB row), so users can hold many and new roles need no code change. */
export interface Role {
  id: string;
  name: string;
}

export interface User extends BaseModel {
  email: string;
  name: string;
  /** Public URL of the user's avatar, if set. */
  avatarUrl?: string | null;
  /** Role names the user holds (e.g. ['ADMIN', 'USER']). */
  roles: string[];
}
