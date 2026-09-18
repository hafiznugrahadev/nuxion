# Web recipe — Nuxt admin feature slice

File-by-file recipe for the admin CRUD page under `apps/web/app/features/<feature>/`,
with excerpts from the canonical `user` slice. Nuxt 4 (srcDir `app/`, alias `~`),
Tailwind v4 MD3 tokens, TanStack Query (`@tanstack/vue-query`, wired in
`plugins/vue-query.ts` with `staleTime: 5s`), vee-validate + zod, reka-ui via the
local `components/ui/*` primitives, `@nuxtjs/i18n` (`no_prefix`, locales en/id).

A new feature needs:

```
apps/web/app/features/<feature>/
├── types.ts                    # param types + re-exported shared types
├── schemas/<feature>.schema.ts # zod (create/edit), mirrors the BE DTOs
├── api/<feature>.api.ts        # fetchers via useApi() + unwrap/unwrapPaginated
├── composables/use<Feature>s.ts# useUsers-style query + mutations
├── components/<Feature>Table.vue      # toolbar + table + pagination + filter sheet
├── components/<Feature>FormModal.vue  # one modal for create + edit
└── index.ts                    # public barrel — the ONLY import surface
apps/web/app/pages/admin/<feature>/index.vue   # thin page
apps/web/app/components/shell/AppSidebar.vue   # nav entry (adminOnly)
apps/web/i18n/locales/{en,id}.json             # <feature>.* keys, both locales
apps/web/e2e/<feature>.e2e.ts                  # Playwright
```

`features/` is **not** auto-imported (boundary rule): pages import via the barrel
(`import { UserTable } from '~/features/user'`). Components inside a feature
import each other relatively (`../composables/useUsers`).

## 1. types.ts + schemas

```ts
export type { User } from '@nuxion/shared-types';

export interface UserListParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  search?: string;
  /** Server-side sort (whitelisted by the API: name | email | createdAt). */
  sortBy?: 'name' | 'email' | 'createdAt';
  order?: 'asc' | 'desc';
  roles?: string[];
}
```

The zod schema is FE-only (BE validates with class-validator) but mirrors the DTO:

```ts
export const createUserSchema = z.object({
  email: z.string().email('Enter a valid email'),
  name: z.string().min(2, 'Name is too short'),
  password: z.string().min(8, 'At least 8 characters'),
  roles: z.array(roleEnum).min(1, 'Select at least one role'),
});

/** Edit: email is immutable; blank password means "keep current". */
export const editUserSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  password: z.string().min(8, 'At least 8 characters').or(z.literal('')),
  roles: z.array(roleEnum).min(1, 'Select at least one role'),
});
```

Export `z.infer` types for create/update values. When create and edit differ,
switch schemas by mode (see FormModal below) instead of one loose union.

## 2. api/<feature>.api.ts — fetchers

A `use<Feature>Api()` composable returning plain methods; every call goes
through `useApi()` (Bearer header + transparent 401→refresh→replay) and unwraps
the envelope (`unwrap` / `unwrapPaginated` from `lib/api-client.ts`):

```ts
export function useUserApi() {
  const api = useApi();
  return {
    list(params: UserListParams): Promise<Paginated<User>> {
      return api<ApiResponse<User[]>>('/users', { query: params }).then(unwrapPaginated);
    },
    create(body: CreateUserValues): Promise<User> {
      return api<ApiResponse<User>>('/users', { method: 'POST', body }).then(unwrap);
    },
    update(id: string, body: UpdateUserValues): Promise<User> {
      /* PATCH */
    },
    remove(id: string): Promise<User> {
      /* DELETE */
    },
  };
}
```

`unwrapPaginated` turns the envelope into `{ data, meta }` (`meta: total, page,
limit, totalPages`). Never build a `$fetch` per feature — auth, error shape and
refresh-replay live in the shared chain.

## 3. composables — query + mutations

List via the generic wrapper (reactive params → refetch, `keepPreviousData` so
paging doesn't flash):

```ts
export function useUsers(params: MaybeRefOrGetter<UserListParams>) {
  const userApi = useUserApi();
  return usePaginatedQuery(
    'users',
    (p: UserListParams) => userApi.list(p),
    () => toValue(params),
  );
}
```

Mutations via `useApiMutation` — cache invalidation and toasts are centralized;
call sites stay declarative and use `t()` for the success message:

```ts
export function useCreateUser() {
  const userApi = useUserApi();
  const { t } = useI18n();
  return useApiMutation((body: CreateUserValues) => userApi.create(body), {
    invalidateKeys: ['users'],
    successMessage: t('users.toasts.created'),
  });
}
```

The query key in `usePaginatedQuery` is `[key, params]`, so invalidating
`['users']` refreshes every filtered/sorted page at once. Mutation errors toast
in `useApiMutation.onError` — call sites `try { await mutateAsync(...) } catch {}`
with an **empty catch**.

## 4. <Feature>Table.vue — the page body

One component owns: toolbar, list query state, table, pagination, filter sheet,
and wiring to the FormModal. Canonical state block:

```ts
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
  search: search.value || undefined, // undefined drops the param
  roles: selectedRoles.value.length ? [...selectedRoles.value] : undefined,
}));

const { data, isLoading, isError, error, refetch } = useUsers(params);
const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta);

// Header click → server refetch (Table only emits; the API is source of truth).
function onSort(next: SortState) {
  sort.value = next;
  page.value = 1;
}
```

Rules that keep every list page identical:

- **Toolbar** is mobile-first flex: Add button `order-first w-full
sm:order-last sm:w-auto`; search input is a pill (`rounded-full`, leading
  `search` MaterialSymbol, `sm:max-w-xs`); filter trigger is `Button
variant="outline" size="icon"` with an active-count badge dot
  (`-right-1.5 -top-1.5 bg-primary`).
- **States** render exclusively, in order: `<ErrorState v-if="isError"
:message="error?.message" @retry="refetch()" />` → `<LoadingState v-else-if
"isLoading" />` → `<EmptyState v-else-if="rows.length === 0" … />` → the table
  wrapped in `<Card v-else class="overflow-hidden">`. No skeletons, no bespoke
  spinners.
- **Columns**: only whitelisted-by-API columns get `sortable: true` (relations
  can't be `orderBy`'d); the actions column is appended only when the user can
  write (`align: 'right'`).
- **Cells** override via `#cell-{key}` slots; the slot hands back
  `Record<string, unknown>`, so keep a tiny `const asUser = (row: unknown) =>
row as User` cast helper. Avatar cell = initials in `bg-primary-container
text-on-primary-container`; enum-ish cells = `Badge` with a variant map;
  dates = `toLocaleDateString('id-ID')`.
- **Row actions** are 40px icon buttons: `class="touch-target relative flex
h-10 w-10 items-center justify-center rounded-full …"`, edit hovers
  `hover:bg-on-surface-variant/10`, delete hovers `hover:bg-error/10
hover:text-error`, each with a `:title`/`aria-label`.
- **Pagination** (`v-if="meta && meta.totalPages > 1"`): left `users.pagination.total
{n}` count, right prev/next `Button variant="outline" size="sm"` with
  `:disabled` guards + `Page X / Y`. No page-size selector.
- **Filter sheet** = `Sheet side="right"` with a `Checkbox` list (`label` wraps
  `Checkbox` + text, `:for`/`id` pair); every toggle applies **server-side
  immediately** and resets `page = 1`; a Reset button (`disabled` when empty)
  clears. Comment from the code: same contract the old inline chips had.

### ui/Table.vue contract (do not fork it)

```ts
interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  sortable?: boolean;
}
interface SortState {
  key: string;
  order: 'asc' | 'desc';
}
// props: columns, rows, rowKey?, sort?  |  emit: 'update:sort'
```

The table is a pure view: clicking a sortable header toggles asc→desc (a new
column starts asc) and **emits** `update:sort`; it never reorders rows. Bind the
current state back (`:sort="sort"`) so the arrow and `aria-sort` mirror reality
on first load. If you need client-side sorting somewhere else, build it in the
feature — don't change `Table.vue`.

## 5. <Feature>FormModal.vue — one modal, two modes

```ts
const open = defineModel<boolean>('open', { default: false });
const props = defineProps<{ user?: User | null }>();
const emit = defineEmits<{ saved: [] }>();
const isEdit = computed(() => !!props.user);

const { handleSubmit, resetForm, errors } = useForm({
  validationSchema: computed(() => toTypedSchema(isEdit.value ? editUserSchema : createUserSchema)),
});

// (Re)seed the form whenever the modal opens for a new target.
watch(
  () => [open.value, props.user?.id] as const,
  () => {
    if (!open.value) return;
    resetForm({
      values: props.user
        ? { name: props.user.name, password: '', roles: [...props.user.roles] }
        : { email: '', name: '', password: '', roles: [UserRole.USER] },
    });
  },
  { immediate: true },
);

const onSubmit = handleSubmit(async (values) => {
  try {
    if (isEdit.value && props.user) {
      const body: UpdateUserValues = { name: values.name, roles: values.roles };
      if (values.password) body.password = values.password; // blank = keep current
      await update.mutateAsync({ id: props.user.id, body });
    } else {
      await create.mutateAsync(values);
    }
    open.value = false;
    emit('saved');
  } catch {
    /* error toast handled centrally by useApiMutation */
  }
});
```

- `pending` combines create+update `isPending` (disable the submit button, swap
  its label to `saving`).
- Immutable fields (email in edit) render `disabled` showing the stored value —
  don't just hide them.
- Standard inputs share one `inputClass` (h-10 rounded-sm border-outline,
  `focus:ring-primary`); `PasswordField` self-registers into the same
  `useForm` context with just `name` + `label`.
- The parent listens once: `<UserFormModal v-model:open="formOpen" :user="editing"
@saved="refetch()" />` with `openCreate()`/`openEdit(row)` setters.

## 6. Delete — promise confirm

```ts
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
    /* toast handled */
  }
}
```

`useConfirm()` resolves false on cancel/scrim/Escape; the single host
(`ConfirmDialog` in `app.vue`) makes every dangerous action read the same. Never
build a per-feature confirm dialog.

## 7. Thin page + navigation

`pages/admin/<feature>/index.vue` is only shell + barrel import:

```vue
<script setup lang="ts">
// Explicit barrel import — features/ is NOT auto-imported (SPEC boundary rule).
import { UserTable } from '~/features/user';
import { APP_NAME } from '~/lib/constants';
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: `Users · ${APP_NAME}` }); // titleTemplate is '%s'
</script>

<template>
  <div class="space-y-6">
    <PageHeading
      :title="$t('users.title')"
      :breadcrumbs="[
        { label: $t('nav.dashboard'), to: '/admin/dashboard' },
        { label: $t('users.title') },
      ]"
    />
    <UserTable />
  </div>
</template>
```

- `/admin/**` is CSR via `routeRules` in `nuxt.config.ts` — do NOT add
  `ssr: false` to `definePageMeta`.
- Route guards are the `auth` + `admin` middleware (client-only redirects);
  button/`canManage` gating in the component is UX only — the API enforces.
- Add the sidebar entry in `components/shell/AppSidebar.vue` (`adminOnly: true`
  for admin features).

## 8. i18n keys — copy this tree

Every user-visible string goes through `t()`, with the **same key tree** in
`apps/web/i18n/locales/en.json` and `id.json`:

```jsonc
"<feature>": {
  "title": "…", "search": "…", "addX": "…",
  "noResults": "…", "noResultsHint": "…",
  "filter": { "title": "…", "desc": "…", "<facet>": "…", "reset": "…" },
  "columns": { "…": "…", "action": "…" },
  "pagination": { "prev": "…", "next": "…", "page": "…", "of": "/", "total": "{n} …" },
  "deleteModal": { "title": "…", "body": "… {name} …", "confirm": "…", "cancel": "…" },
  "form": { "newTitle": "…", "editTitle": "…", "newDesc": "…", "editDesc": "…",
            "<field>": "…", "cancel": "…", "saving": "…",
            "saveChanges": "…", "createX": "…" },
  "toasts": { "created": "…", "updated": "…", "deleted": "…" }
}
```

Shared `state.*` (loading/empty/error/retry) and `nav.*` already exist. Verify
parity before committing — flatten and diff both locales:

```bash
node -e '
const flat=(o,p="")=>Object.entries(o).flatMap(([k,v])=>typeof v==="object"?flat(v,p+k+"."):[p+k]);
const en=flat(require("./apps/web/i18n/locales/en.json")).sort();
const id=flat(require("./apps/web/i18n/locales/id.json")).sort();
const miss1=en.filter(k=>!id.includes(k)), miss2=id.filter(k=>!en.includes(k));
console.log("missing in id:",miss1,"\nmissing in en:",miss2);'
```

## 9. Theming, a11y, e2e

- **MD3 tokens only**: surfaces `surface-container-low/high` for sheets/modals,
  text `foreground`/`muted-foreground`/`on-surface-variant`, dividers
  `outline-variant`, destructive `text-destructive` + `bg-error/10`. No shadows
  for elevation, no raw hex.
- **Contrast is a gate**: after any color change, probe computed styles in the
  browser for both themes — AA ≥ 4.5:1. Status pills keep the same ink in both
  themes precisely so the 10–15 % tint passes AA (see `ui/Badge.vue`).
- **A11y**: `aria-sort` comes free with `Table.vue`; icon buttons need
  `:title`/`aria-label`; checkboxes live inside `label[for]` wrappers; hit areas
  via `touch-target` (+ `[--touch-slop:-Npx]` when tight).
- **reka-ui portals**: any `*Content` (popover, select, tooltip) must be wrapped
  in its `*Portal` — inline content gets trapped under later positioned siblings
  and `z-50` cannot fix it (documented in `common/fields/SelectField.vue`).
- **E2E** (`e2e/<feature>.e2e.ts`, Playwright): reuse `helpers` (`login`,
  `waitForHydration`, `apiToken`, `API_BASE`); create throwaway rows via the API
  (not the UI) and clean them up in `finally`. Target roles/aria semantics —
  `getByRole('button', { name: /add user/i })`, `getByPlaceholder` — never CSS
  selectors. If the UI changes shape (chips → sheet), update the spec in the
  same PR. Two gotchas: `name` matching is substring/case-insensitive by
  default (use `exact: true` when "Admin" would also match "Super Admin"), and
  a modal Sheet/Dialog hides the rest of the page from the a11y tree — click
  the dialog's Close button before asserting on the table behind it.
