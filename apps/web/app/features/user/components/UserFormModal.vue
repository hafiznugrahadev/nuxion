<script setup lang="ts">
import { computed, watch } from 'vue';
import { useForm, useField } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { UserRole, type User } from '@nuxion/shared-types';
import { roleLabel } from '~/lib/roles';
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
const ALL_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER];

const create = useCreateUser();
const update = useUpdateUser();
const pending = computed(() => create.isPending.value || update.isPending.value);

const { handleSubmit, resetForm, errors } = useForm({
  validationSchema: computed(() => toTypedSchema(isEdit.value ? editUserSchema : createUserSchema)),
});
const { value: email } = useField<string>('email');
const { value: name } = useField<string>('name');
const { value: password } = useField<string>('password');
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
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-foreground">{{ $t('users.form.email') }}</label>
        <input
          v-if="!isEdit"
          v-model="email"
          type="email"
          placeholder="name@example.com"
          :class="inputClass"
        />
        <input v-else :value="props.user?.email" disabled :class="[inputClass, 'opacity-60']" />
        <p v-if="errors.email" class="text-xs text-destructive">{{ errors.email }}</p>
      </div>

      <!-- Name -->
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-foreground">{{ $t('users.form.name') }}</label>
        <input v-model="name" type="text" placeholder="Full name" :class="inputClass" />
        <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
      </div>

      <!-- Password -->
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-foreground">
          {{ $t('users.form.password') }}
          <span v-if="isEdit" class="font-normal text-muted-foreground">{{
            $t('users.form.passwordHint')
          }}</span>
        </label>
        <input v-model="password" type="password" placeholder="••••••••" :class="inputClass" />
        <p v-if="errors.password" class="text-xs text-destructive">{{ errors.password }}</p>
      </div>

      <!-- Roles -->
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-foreground">{{ $t('users.form.roles') }}</label>
        <div class="flex flex-wrap gap-4 pt-1">
          <label
            v-for="role in ALL_ROLES"
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
        <p v-if="errors.roles" class="text-xs text-destructive">{{ errors.roles }}</p>
      </div>

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
