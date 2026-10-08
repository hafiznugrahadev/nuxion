<script setup lang="ts">
import { computed, watch } from 'vue';
import { useForm, useField } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { UserRole, type User } from '@nuxion/shared-types';
import { roleLabel } from '~/lib/roles';
import { cn } from '~/lib/utils';
// Cross-feature import goes through the barrel — the sanctioned path between
// feature slices (deep imports are the boundary violation, this is not).
import { useRoles } from '~/features/role';
import {
  createUserSchema,
  editUserSchema,
  type CreateUserValues,
  type UpdateUserValues,
} from '../schemas/user.schema';
import { useCreateUser, useUpdateUser } from '../composables/useUsers';

type RoleValue = CreateUserValues['roles'];

const open = defineModel<boolean>('open', { default: false });
const props = defineProps<{ user?: User | null }>();
const emit = defineEmits<{ saved: [] }>();

const isEdit = computed(() => !!props.user);

// Assignable roles come from the catalog (custom roles included). While it is
// unavailable, fall back to the built-ins; a user's held roles are always
// unioned in so editing can never silently drop a custom role.
const WELL_KNOWN = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER].map((name) => ({
  name,
}));
const { data: catalog } = useRoles();
const availableRoles = computed(() => {
  const names = new Set<string>((catalog.value ?? WELL_KNOWN).map((r) => r.name));
  for (const held of props.user?.roles ?? []) names.add(held);
  return [...names];
});

const create = useCreateUser();
const update = useUpdateUser();
const pending = computed(() => create.isPending.value || update.isPending.value);

const { handleSubmit, resetForm, errors } = useForm({
  validationSchema: computed(() => toTypedSchema(isEdit.value ? editUserSchema : createUserSchema)),
});
const { value: email } = useField<string>('email');
const { value: name } = useField<string>('name');
const { value: roles } = useField<string[]>('roles');

// (Re)seed the form whenever the modal opens for a new target.
watch(
  () => [open.value, props.user?.id] as const,
  () => {
    if (!open.value) return;
    resetForm({
      values: props.user
        ? { name: props.user.name, password: '', roles: [...props.user.roles] as RoleValue }
        : { email: '', name: '', password: '', roles: [UserRole.USER] },
    });
  },
  { immediate: true },
);

function toggleRole(role: string, checked: boolean) {
  const next = new Set(roles.value ?? []);
  if (checked) next.add(role);
  else next.delete(role);
  roles.value = [...next];
}

const inputClass =
  'h-10 w-full rounded-sm border border-outline bg-transparent px-4 text-sm text-foreground placeholder:text-on-surface-variant/85 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
const ERROR_CLASS = 'border-destructive focus:border-destructive focus:ring-destructive';

const onSubmit = handleSubmit(async (values) => {
  try {
    if (isEdit.value && props.user) {
      const body: UpdateUserValues = { name: values.name, roles: values.roles };
      if (values.password) body.password = values.password;
      await update.mutateAsync({ id: props.user.id, body });
    } else {
      await create.mutateAsync(values as Parameters<typeof create.mutateAsync>[0]);
    }
    open.value = false;
    emit('saved');
  } catch {
    /* error toast handled centrally by useApiMutation */
  }
});
</script>

<template>
  <Modal
    v-model:open="open"
    :title="isEdit ? $t('users.form.editTitle') : $t('users.form.newTitle')"
    :description="isEdit ? $t('users.form.editDesc') : $t('users.form.newDesc')"
  >
    <form class="space-y-5" @submit="onSubmit">
      <!-- Email -->
      <Fieldset name="email" :label="$t('users.form.email')" :error="errors.email">
        <template #default="{ id, describedBy, invalid }">
          <input
            v-if="!isEdit"
            :id="id"
            v-model="email"
            type="email"
            placeholder="name@example.com"
            :aria-describedby="describedBy"
            :aria-invalid="invalid"
            :class="cn(inputClass, invalid && ERROR_CLASS)"
          />
          <input
            v-else
            :id="id"
            :value="props.user?.email"
            disabled
            :aria-describedby="describedBy"
            :class="[inputClass, 'opacity-60']"
          />
        </template>
      </Fieldset>

      <!-- Name -->
      <Fieldset name="name" :label="$t('users.form.name')" :error="errors.name">
        <template #default="{ id, describedBy, invalid }">
          <input
            :id="id"
            v-model="name"
            type="text"
            placeholder="Full name"
            :aria-describedby="describedBy"
            :aria-invalid="invalid"
            :class="cn(inputClass, invalid && ERROR_CLASS)"
          />
        </template>
      </Fieldset>

      <!-- Password (PasswordField wires itself into the same vee-validate form) -->
      <PasswordField
        name="password"
        :label="$t('users.form.password')"
        placeholder="••••••••"
        autocomplete="new-password"
        :hint="isEdit ? $t('users.form.passwordHint') : undefined"
      />

      <!-- Roles -->
      <Fieldset group name="roles" :label="$t('users.form.roles')" :error="errors.roles">
        <template #default="{ labelId, describedBy }">
          <div
            class="flex flex-wrap gap-4 pt-1"
            role="group"
            :aria-labelledby="labelId"
            :aria-describedby="describedBy"
          >
            <label
              v-for="role in availableRoles"
              :key="role"
              :for="`role-${role}`"
              class="flex cursor-pointer items-center gap-2 text-sm text-foreground"
            >
              <Checkbox
                :id="`role-${role}`"
                :model-value="roles?.includes(role)"
                @update:model-value="toggleRole(role, $event as boolean)"
              />
              {{ roleLabel(role, $t) }}
            </label>
          </div>
        </template>
      </Fieldset>

      <div class="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" @click="open = false">{{
          $t('users.form.cancel')
        }}</Button>
        <Button type="submit" :disabled="pending">
          {{
            pending
              ? $t('users.form.saving')
              : isEdit
                ? $t('users.form.saveChanges')
                : $t('users.form.createUser')
          }}
        </Button>
      </div>
    </form>
  </Modal>
</template>
