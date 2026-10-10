'use client';

import { EmptyState, ErrorState, LoadingState } from '@/components/blocks/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { getAuthState, hasRole, subscribeAuth } from '@/lib/auth-store';
import { isWellKnownRole, roleLabel } from '@/lib/roles';
import { useConfirm } from '@/lib/use-confirm';
import type { Role } from '@nuxion/shared-types';
import { UserRole } from '@nuxion/shared-types';
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useSyncExternalStore } from 'react';
import { useDeleteRole, useRoles } from '../hooks';
import { RoleFormModal } from './role-form-modal';

/**
 * The roles catalog (port of the Nuxt variant's RoleTable): holder count
 * front and center (deleting a role detaches every holder), built-ins locked,
 * writes super-admin-gated. Reads are ADMIN+; the API enforces both, the UI
 * only mirrors it (hiding buttons is UX, not security).
 */
export function RolesTable() {
  const t = useTranslations();
  const { confirm } = useConfirm();
  const showActions = useSyncExternalStore(
    subscribeAuth,
    () => hasRole(getAuthState(), UserRole.SUPER_ADMIN),
    () => false,
  );

  const { data, isLoading, isError, error, refetch } = useRoles();
  const rows = data ?? [];

  // Create / edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);

  // Delete confirm — shared promise-based dialog, with the holder count
  // spelled out because "who loses access" is the decision this page exists
  // for.
  const remove = useDeleteRole();
  async function askDelete(role: Role) {
    const holders = role.userCount ?? 0;
    const ok = await confirm({
      title: t('roles.deleteModal.title'),
      description: holders
        ? t('roles.deleteModal.bodyHolders', {
            name: roleLabel(role.name, (key) => t(key)),
            n: holders,
          })
        : t('roles.deleteModal.body', { name: roleLabel(role.name, (key) => t(key)) }),
      confirmText: t('roles.deleteModal.confirm'),
      cancelText: t('roles.deleteModal.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(role.id);
    } catch {
      /* toast handled by useApiMutation */
    }
  }

  const roleVariant: Record<string, 'default' | 'secondary' | 'muted' | 'outline'> = {
    SUPER_ADMIN: 'default',
    ADMIN: 'secondary',
    USER: 'muted',
  };
  const created = (iso: string | undefined) =>
    iso ? new Date(iso).toLocaleDateString('id-ID') : '-';
  const holders = (n: number) =>
    n === 1 ? t('roles.usersCountOne') : t('roles.usersCount', { n });

  // Kolom mengikuti kebutuhan halaman: jumlah pemegang adalah informasi yang
  // menentukan (menghapus role melepasnya dari semua pemegang). Kolom aksi
  // hanya untuk super admin; role bawaan tidak bisa diubah namanya.
  const columns = showActions
    ? [
        { key: 'name', label: t('roles.columns.role') },
        { key: 'userCount', label: t('roles.columns.users') },
        { key: 'createdAt', label: t('roles.columns.created') },
        { key: 'actions', label: t('roles.columns.action'), align: 'right' as const },
      ]
    : [
        { key: 'name', label: t('roles.columns.role') },
        { key: 'userCount', label: t('roles.columns.users') },
        { key: 'createdAt', label: t('roles.columns.created') },
      ];

  return (
    <div className="space-y-4">
      {/* Toolbar. Mobile: add button first (full-width); desktop: right. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {showActions && (
          <Button
            className="w-full sm:ml-auto sm:w-auto"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={20} aria-hidden="true" />
            {t('roles.addRole')}
          </Button>
        )}
      </div>

      {isError ? (
        <ErrorState message={error?.message} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState title={t('roles.noResults')} description={t('roles.noResultsHint')} />
      ) : (
        <Card className="overflow-hidden">
          <Table
            columns={columns}
            rows={rows}
            rowKey="id"
            cells={{
              name: (row: Role) => (
                <div className="flex items-center gap-2">
                  <Badge variant={roleVariant[row.name] ?? 'outline'}>
                    {roleLabel(row.name, (key) => t(key))}
                  </Badge>
                  {isWellKnownRole(row.name) && (
                    <span
                      className="flex items-center gap-1 text-xs text-muted-foreground"
                      title={t('roles.protected')}
                    >
                      <ShieldCheck size={12} aria-hidden="true" />
                      {t('roles.builtIn')}
                    </span>
                  )}
                </div>
              ),
              userCount: (row: Role) => (
                <span className="text-muted-foreground">{holders(row.userCount ?? 0)}</span>
              ),
              createdAt: (row: Role) => (
                <span className="text-muted-foreground">{created(row.createdAt)}</span>
              ),
              ...(showActions
                ? {
                    actions: (row: Role) => {
                      const locked = isWellKnownRole(row.name);
                      return (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="touch-target relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                            disabled={locked}
                            title={t('roles.protected')}
                            aria-label={t('roles.form.editTitle')}
                            onClick={() => {
                              setEditing(row);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil size={18} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="touch-target relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                            disabled={locked}
                            title={t('roles.protected')}
                            aria-label={t('roles.deleteModal.title')}
                            onClick={() => void askDelete(row)}
                          >
                            <Trash2 size={18} aria-hidden="true" />
                          </button>
                        </div>
                      );
                    },
                  }
                : {}),
            }}
          />
        </Card>
      )}

      {/* Create / edit */}
      <RoleFormModal open={formOpen} onOpenChange={setFormOpen} role={editing} />
    </div>
  );
}
