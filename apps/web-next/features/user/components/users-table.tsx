'use client';

import { EmptyState, ErrorState, LoadingState } from '@/components/blocks/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/common/field';
import { Sheet } from '@/components/ui/sheet';
import { Table, type SortState } from '@/components/ui/table';
import { getAuthState, hasRole, subscribeAuth } from '@/lib/auth-store';
import { roleLabel } from '@/lib/roles';
import { useConfirm } from '@/lib/use-confirm';
import { UserRole, type User } from '@nuxion/shared-types';
import { Pencil, Search, SlidersHorizontal, Trash2, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRoles } from '@/features/role';
import { useDeleteUser, useUsers } from '../hooks';
import type { UserListParams } from '../types';
import { UserFormModal } from './user-form-modal';

/**
 * The users list (port of the Nuxt variant's UserTable): toolbar (debounced
 * search + role-filter sheet + add for super admins), the pure-view table
 * with server-side sort, pagination, and the shared state vocabulary. The API
 * is the source of truth — no client-side filtering or reordering.
 */
export function UsersTable() {
  const t = useTranslations();
  const { confirm } = useConfirm();

  // canManage is a super-admin capability; the API enforces it regardless
  // (hiding buttons is UX, not security).
  const showActions = useCanManage();

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  // Debounced mirror of the input: typing updates the box instantly but only
  // fires one request per pause — not one per keystroke.
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  // Mirrors the API defaults (newest first) so the first load's arrow is honest.
  const [sort, setSort] = useState<SortState>({ key: 'createdAt', order: 'desc' });
  const [page, setPage] = useState(1);

  // Debounce: the input updates instantly, the request param lags by one
  // pause. A new term shrinks the result set, so page restarts at 1 together
  // with it (same as sorting and role filters).
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const params: UserListParams = {
    page,
    limit: 10,
    sortBy: sort.key as UserListParams['sortBy'],
    order: sort.order,
    search: searchDebounced || undefined,
    roles: selectedRoles.length ? [...selectedRoles] : undefined,
  };

  // Role filter options come from the catalog so custom roles filter too;
  // until it loads, the built-ins stand in.
  const WELL_KNOWN = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER];
  const { data: roleCatalog } = useRoles();
  const roleOptions = (roleCatalog ?? WELL_KNOWN.map((name) => ({ name }))).map((r) => ({
    label: roleLabel(r.name, (key) => t(key)),
    value: r.name,
  }));

  const { data, isLoading, isError, error, refetch } = useUsers(params);
  const rows = data?.data ?? [];
  const meta = data?.meta;

  function toggleRole(value: string) {
    setSelectedRoles((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return [...next];
    });
    setPage(1);
  }

  // Create / edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const remove = useDeleteUser();
  async function askDelete(user: User) {
    const ok = await confirm({
      title: t('users.deleteModal.title'),
      description: t('users.deleteModal.body', { name: user.name }),
      confirmText: t('users.deleteModal.confirm'),
      cancelText: t('users.deleteModal.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(user.id);
    } catch {
      /* toast handled by useApiMutation */
    }
  }

  const roleVariant: Record<string, 'default' | 'secondary' | 'muted' | 'outline'> = {
    SUPER_ADMIN: 'default',
    ADMIN: 'secondary',
    USER: 'muted',
  };
  const initials = (name: string) =>
    name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  const joined = (iso: string) => new Date(iso).toLocaleDateString('id-ID');

  // Kolom mengikuti kebutuhan halaman (kolom aksi hanya untuk super admin).
  // Sortable hanya pada kolom yang di-whitelist API (name/createdAt); roles
  // adalah relasi — tidak bisa di-orderBy, actions bukan data.
  const columns = showActions
    ? [
        { key: 'name', label: t('users.columns.user'), sortable: true },
        { key: 'roles', label: t('users.columns.roles') },
        { key: 'createdAt', label: t('users.columns.joined'), sortable: true },
        { key: 'actions', label: t('users.columns.action'), align: 'right' as const },
      ]
    : [
        { key: 'name', label: t('users.columns.user'), sortable: true },
        { key: 'roles', label: t('users.columns.roles') },
        { key: 'createdAt', label: t('users.columns.joined'), sortable: true },
      ];

  function onSort(next: SortState) {
    setSort(next);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar. Mobile: add button first (full-width), then search + filter
           side by side; desktop (sm+): search + filter left, add right. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {showActions && (
          <Button
            className="order-first w-full sm:order-last sm:w-auto"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <UserPlus size={20} aria-hidden="true" />
            {t('users.addUser')}
          </Button>
        )}
        <div className="flex flex-row items-center gap-3">
          <Field className="min-w-0 flex-1 sm:max-w-xs">
            {({ id }) => (
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id={id}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label={t('users.search')}
                  placeholder={t('users.search')}
                  className="h-10 w-full rounded-full border border-outline bg-transparent pl-10 pr-5 text-sm text-foreground transition-colors placeholder:text-on-surface-variant/85 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </Field>
          {/* Filter trigger: opens the right-side sheet. Badge shows how many
               role filters are active (server-side; API is source of truth). */}
          <Button
            variant="outline"
            size="icon"
            className="relative shrink-0"
            title={t('users.filter.title')}
            aria-label={t('users.filter.title')}
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal size={20} aria-hidden="true" />
            {selectedRoles.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                {selectedRoles.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {isError ? (
        <ErrorState message={error?.message} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState title={t('users.noResults')} description={t('users.noResultsHint')} />
      ) : (
        <Card className="overflow-hidden">
          <Table
            sort={sort}
            columns={columns}
            rows={rows}
            rowKey="id"
            onSort={onSort}
            cells={{
              name: (row: User) => (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-[11px] font-semibold text-on-primary-container">
                    {initials(row.name)}
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {row.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.email}
                    </span>
                  </div>
                </div>
              ),
              roles: (row: User) => (
                <div className="flex flex-wrap gap-1">
                  {row.roles.map((role) => (
                    <Badge key={role} variant={roleVariant[role] ?? 'outline'}>
                      {roleLabel(role, (key) => t(key))}
                    </Badge>
                  ))}
                </div>
              ),
              createdAt: (row: User) => (
                <span className="text-muted-foreground">{joined(row.createdAt)}</span>
              ),
              ...(showActions
                ? {
                    actions: (row: User) => (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="touch-target relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground"
                          title={t('users.form.editTitle')}
                          onClick={() => {
                            setEditing(row);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil size={18} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="touch-target relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                          title={t('users.deleteModal.title')}
                          onClick={() => void askDelete(row)}
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      </div>
                    ),
                  }
                : {}),
            }}
          />
        </Card>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('users.pagination.total', { n: meta.total })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="touch-target [--touch-slop:-6px]"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t('users.pagination.prev')}
            </Button>
            <span className="text-sm">
              {t('users.pagination.page')} {meta.page} {t('users.pagination.of')} {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="touch-target [--touch-slop:-6px]"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('users.pagination.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Create / edit */}
      <UserFormModal open={formOpen} onOpenChange={setFormOpen} user={editing} />

      {/* Filter sheet: role multi-select (checkbox list); applies server-side
          on every toggle, same contract the inline chips had. */}
      <Sheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title={t('users.filter.title')}
        description={t('users.filter.desc')}
      >
        <div className="space-y-6">
          <Field label={t('users.filter.roles')}>
            {({ id, describedBy }) => (
              <div
                role="group"
                aria-labelledby={id}
                aria-describedby={describedBy}
                className="space-y-2"
              >
                {roleOptions.map((opt) => (
                  <label
                    key={opt.value}
                    htmlFor={`filter-${opt.value}`}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-on-surface transition-colors hover:bg-on-surface/8"
                  >
                    <Checkbox
                      id={`filter-${opt.value}`}
                      checked={selectedRoles.includes(opt.value)}
                      onChange={() => toggleRole(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}
          </Field>
          <Button
            variant="outline"
            className="w-full"
            disabled={selectedRoles.length === 0}
            onClick={() => {
              setSelectedRoles([]);
              setPage(1);
            }}
          >
            {t('users.filter.reset')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

/** Super-admin capability from the client session (UX only — the API enforces). */
function useCanManage() {
  return useSyncExternalStore(
    subscribeAuth,
    () => hasRole(getAuthState(), UserRole.SUPER_ADMIN),
    () => false,
  );
}
