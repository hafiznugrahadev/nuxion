<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Role } from '@nuxion/shared-types';
import { useAuthStore } from '~/stores/auth';
import { roleLabel, isWellKnownRole } from '~/lib/roles';
import { useRoles, useDeleteRole } from '../composables/useRoles';
import RoleFormModal from './RoleFormModal.vue';

const { t } = useI18n();

const auth = useAuthStore();
// Reads are ADMIN+, writes are SUPER_ADMIN; the API enforces both, the UI
// only mirrors it (hiding buttons is UX, not security).
const canManage = computed(() => auth.isSuperAdmin);

const { data, isLoading, isError, error, refetch } = useRoles();
const rows = computed(() => data.value ?? []);

// Create / edit modal
const formOpen = ref(false);
const editing = ref<Role | null>(null);
function openCreate() {
  editing.value = null;
  formOpen.value = true;
}
function openEdit(role: Role) {
  editing.value = role;
  formOpen.value = true;
}

// Delete confirm — shared promise-based dialog, with the holder count spelled
// out because "who loses access" is the decision this page exists for.
const remove = useDeleteRole();
const { confirm } = useConfirm();

async function askDelete(role: Role) {
  const holders = role.userCount ?? 0;
  const ok = await confirm({
    title: t('roles.deleteModal.title'),
    description: holders
      ? t('roles.deleteModal.bodyHolders', { name: roleLabel(role.name, t), n: holders })
      : t('roles.deleteModal.body', { name: roleLabel(role.name, t) }),
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

const roleVariant: Record<string, string> = {
  SUPER_ADMIN: 'default',
  ADMIN: 'secondary',
  USER: 'muted',
};
const created = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleDateString('id-ID') : '-';
const holders = (n: number) => (n === 1 ? t('roles.usersCountOne') : t('roles.usersCount', { n }));

// Reusable Table slots hand back Record<string, unknown>; restore the Role type.
const asRole = (row: unknown) => row as Role;

// Kolom mengikuti kebutuhan halaman: jumlah pemegang adalah informasi yang
// menentukan (menghapus role melepasnya dari semua pemegang). Kolom aksi
// hanya untuk super admin; role bawaan tidak bisa diubah namanya.
const columns = computed(() => {
  const cols = [
    { key: 'name', label: t('roles.columns.role') },
    { key: 'userCount', label: t('roles.columns.users') },
    { key: 'createdAt', label: t('roles.columns.created') },
  ];
  return canManage.value
    ? [...cols, { key: 'actions', label: t('roles.columns.action'), align: 'right' as const }]
    : cols;
});
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar. Mobile: add button first (full-width); desktop: right. -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <Button v-if="canManage" class="w-full sm:ml-auto sm:w-auto" @click="openCreate">
        <AppIcon name="add" :size="20" />
        {{ $t('roles.addRole') }}
      </Button>
    </div>

    <ErrorState v-if="isError" :message="(error as Error)?.message" @retry="refetch()" />
    <LoadingState v-else-if="isLoading" />
    <EmptyState
      v-else-if="rows.length === 0"
      :title="$t('roles.noResults')"
      :description="$t('roles.noResultsHint')"
    />

    <!-- Reusable MD3 data table inside an outlined card shell -->
    <Card v-else class="overflow-hidden">
      <Table :columns="columns" :rows="rows" row-key="id" class="min-w-full">
        <template #cell-name="{ row }">
          <div class="flex items-center gap-2">
            <Badge :variant="(roleVariant[asRole(row).name] ?? 'outline') as never">
              {{ roleLabel(asRole(row).name, $t) }}
            </Badge>
            <span
              v-if="isWellKnownRole(asRole(row).name)"
              class="text-xs text-muted-foreground"
              :title="$t('roles.protected')"
            >
              {{ $t('roles.builtIn') }}
            </span>
          </div>
        </template>
        <template #cell-userCount="{ row }">
          <span class="text-muted-foreground">{{ holders(asRole(row).userCount ?? 0) }}</span>
        </template>
        <template #cell-createdAt="{ row }">
          <span class="text-muted-foreground">{{ created(asRole(row).createdAt) }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <button
              class="touch-target relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
              :disabled="isWellKnownRole(asRole(row).name)"
              :title="$t('roles.protected')"
              :aria-label="$t('roles.form.editTitle')"
              @click="openEdit(asRole(row))"
            >
              <AppIcon name="edit" :size="18" />
            </button>
            <button
              class="touch-target relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
              :disabled="isWellKnownRole(asRole(row).name)"
              :title="$t('roles.protected')"
              :aria-label="$t('roles.deleteModal.title')"
              @click="askDelete(asRole(row))"
            >
              <AppIcon name="delete" :size="18" />
            </button>
          </div>
        </template>
      </Table>
    </Card>

    <!-- Create / edit -->
    <RoleFormModal v-model:open="formOpen" :role="editing" @saved="refetch()" />
  </div>
</template>
