<script setup lang="ts">
import { computed, ref } from 'vue';
import { UserRole, type User } from '@nuxion/shared-types';
import { useAuthStore } from '~/stores/auth';
import { roleLabel } from '~/lib/roles';
import { useUsers, useDeleteUser } from '../composables/useUsers';
import UserFormModal from './UserFormModal.vue';
import type { UserListParams } from '../types';
import type { SortState } from '~/components/ui/Table.vue';

const { t } = useI18n();

const auth = useAuthStore();
const canManage = computed(() => auth.isSuperAdmin);

const search = ref('');
const selectedRoles = ref<string[]>([]);
const page = ref(1);
// Mirrors the API defaults (newest first) so the first load's arrow is honest.
const sort = ref<SortState>({ key: 'createdAt', order: 'desc' });
const params = computed<UserListParams>(() => ({
  page: page.value,
  limit: 10,
  sortBy: sort.value.key as UserListParams['sortBy'],
  order: sort.value.order,
  search: search.value || undefined,
  // Server-side filter: the API is the source of truth (no client-side filtering).
  roles: selectedRoles.value.length ? [...selectedRoles.value] : undefined,
}));

// Role filter as multi-select tags — the API returns users holding ANY selected role.
const roleOptions = computed(() => [
  { label: t('users.roles.superAdmin'), value: UserRole.SUPER_ADMIN },
  { label: t('users.roles.admin'), value: UserRole.ADMIN },
  { label: t('users.roles.user'), value: UserRole.USER },
]);
function toggleRole(value: string) {
  const next = new Set(selectedRoles.value);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  selectedRoles.value = [...next];
  page.value = 1;
}
function clearRoles() {
  selectedRoles.value = [];
  page.value = 1;
}

const { data, isLoading, isError, error, refetch } = useUsers(params);
const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta);

// Create / edit modal
const formOpen = ref(false);
const editing = ref<User | null>(null);
function openCreate() {
  editing.value = null;
  formOpen.value = true;
}
function openEdit(user: User) {
  editing.value = user;
  formOpen.value = true;
}

// Delete confirm — shared promise-based dialog (useConfirm), so every
// dangerous action in the app reads the same way.
const remove = useDeleteUser();
const { confirm } = useConfirm();

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

const roleVariant: Record<string, string> = {
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

// Reusable Table slots hand back Record<string, unknown>; restore the User type.
const asUser = (row: unknown) => row as User;

// Kolom mengikuti kebutuhan halaman (kolom aksi hanya untuk super admin).
// Sortable hanya pada kolom yang di-whitelist API (name/createdAt); roles
// adalah relasi — tidak bisa di-orderBy, actions bukan data.
const columns = computed(() => {
  const cols = [
    { key: 'name', label: t('users.columns.user'), sortable: true },
    { key: 'roles', label: t('users.columns.roles') },
    { key: 'createdAt', label: t('users.columns.joined'), sortable: true },
  ];
  return canManage.value
    ? [...cols, { key: 'actions', label: t('users.columns.action'), align: 'right' as const }]
    : cols;
});

// Header click → server refetch (Table only emits; the API is source of truth).
function onSort(next: SortState) {
  sort.value = next;
  page.value = 1;
}
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div class="relative max-w-xs">
          <MaterialSymbol
            name="search"
            :size="18"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            v-model="search"
            :placeholder="$t('users.search')"
            class="h-10 w-full rounded-sm border border-outline bg-transparent pl-10 pr-4 text-sm text-foreground transition-colors placeholder:text-on-surface-variant/85 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <!-- Role filter as MD3 filter chips (server-side; API is source of truth):
             outlined idle, secondary-container tonal + leading check when on. -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            :class="[
              'touch-target relative inline-flex h-8 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors [--touch-slop:-6px]',
              selectedRoles.length === 0
                ? 'border-transparent bg-secondary-container text-on-secondary-container'
                : 'border-outline text-on-surface-variant hover:bg-on-surface/8',
            ]"
            @click="clearRoles"
          >
            {{ $t('users.roles.all') }}
          </button>
          <button
            v-for="opt in roleOptions"
            :key="opt.value"
            type="button"
            :class="[
              'touch-target relative inline-flex h-8 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors [--touch-slop:-6px]',
              selectedRoles.includes(opt.value)
                ? 'border-transparent bg-secondary-container text-on-secondary-container'
                : 'border-outline text-on-surface-variant hover:bg-on-surface/8',
            ]"
            @click="toggleRole(opt.value)"
          >
            <MaterialSymbol v-if="selectedRoles.includes(opt.value)" name="check" :size="14" />
            {{ opt.label }}
          </button>
        </div>
      </div>
      <Button v-if="canManage" size="sm" @click="openCreate">
        <MaterialSymbol name="person_add" :size="18" />
        {{ $t('users.addUser') }}
      </Button>
    </div>

    <ErrorState v-if="isError" :message="(error as Error)?.message" @retry="refetch()" />
    <LoadingState v-else-if="isLoading" />
    <EmptyState
      v-else-if="rows.length === 0"
      :title="$t('users.noResults')"
      :description="$t('users.noResultsHint')"
    />

    <!-- Reusable MD3 data table (bare, no card chrome) -->
    <Table
      v-else
      :sort="sort"
      :columns="columns"
      :rows="rows"
      row-key="id"
      class="min-w-full"
      @update:sort="onSort"
    >
      <template #cell-name="{ row }">
        <div class="flex items-center gap-3">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-[11px] font-semibold text-on-primary-container"
          >
            {{ initials(asUser(row).name) }}
          </div>
          <div class="min-w-0">
            <span class="block truncate text-sm font-medium text-foreground">{{
              asUser(row).name
            }}</span>
            <span class="block truncate text-xs text-muted-foreground">{{
              asUser(row).email
            }}</span>
          </div>
        </div>
      </template>
      <template #cell-roles="{ row }">
        <div class="flex flex-wrap gap-1">
          <Badge
            v-for="role in asUser(row).roles"
            :key="role"
            :variant="(roleVariant[role] ?? 'outline') as never"
          >
            {{ roleLabel(role, $t) }}
          </Badge>
        </div>
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-muted-foreground">{{ joined(asUser(row).createdAt) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <button
            class="touch-target relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground"
            :title="$t('profile.personalInfo.edit')"
            @click="openEdit(asUser(row))"
          >
            <MaterialSymbol name="edit" :size="18" />
          </button>
          <button
            class="touch-target relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
            :title="$t('users.deleteModal.title')"
            @click="askDelete(asUser(row))"
          >
            <MaterialSymbol name="delete" :size="18" />
          </button>
        </div>
      </template>
    </Table>

    <!-- Pagination -->
    <div v-if="meta && meta.totalPages > 1" class="flex items-center justify-between">
      <span class="text-sm text-muted-foreground">{{
        $t('users.pagination.total', { n: meta.total })
      }}</span>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="touch-target [--touch-slop:-6px]"
          :disabled="page <= 1"
          @click="page--"
          >{{ $t('users.pagination.prev') }}</Button
        >
        <span class="text-sm"
          >{{ $t('users.pagination.page') }} {{ meta.page }} {{ $t('users.pagination.of') }}
          {{ meta.totalPages }}</span
        >
        <Button
          variant="outline"
          size="sm"
          class="touch-target [--touch-slop:-6px]"
          :disabled="page >= meta.totalPages"
          @click="page++"
        >
          {{ $t('users.pagination.next') }}
        </Button>
      </div>
    </div>

    <!-- Create / edit -->
    <UserFormModal v-model:open="formOpen" :user="editing" @saved="refetch()" />

    <!-- Delete confirmation comes from the shared useConfirm() host (app.vue). -->
  </div>
</template>
