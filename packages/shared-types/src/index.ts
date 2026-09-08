// Public barrel for @nuxion/shared-types — consumed by both apps/api (CJS)
// and apps/web (Vite/ESM). Use EXPLICIT named re-exports (not `export *`) so the
// compiled CJS output is statically analyzable by cjs-module-lexer / Rollup.
export { UserRole } from './enums/user-role.enum';

export type {
  PaginationMeta,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  Paginated,
} from './types/api-response';
export type { BaseQuery } from './types/query';
export type { BaseModel, User, Role } from './entities';
