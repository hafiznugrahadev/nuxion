<script setup lang="ts">
import { computed, watch } from 'vue';
import { useForm, useField } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import type { Role } from '@nuxion/shared-types';
import { isWellKnownRole } from '~/lib/roles';
import { cn } from '~/lib/utils';
import { createRoleSchema } from '../schemas/role.schema';
import { useCreateRole, useUpdateRole } from '../composables/useRoles';

const open = defineModel<boolean>('open', { default: false });
const props = defineProps<{ role?: Role | null }>();
const emit = defineEmits<{ saved: [] }>();

const { t } = useI18n();

const isEdit = computed(() => !!props.role);
// Built-ins are guarded off before the modal ever opens (the table disables
// the button); this is the defensive second layer for the same rule.
const locked = computed(() => isWellKnownRole(props.role?.name ?? ''));

const create = useCreateRole();
const update = useUpdateRole();
const pending = computed(() => create.isPending.value || update.isPending.value);

const { handleSubmit, resetForm, errors } = useForm({
  validationSchema: computed(() => toTypedSchema(createRoleSchema(t))),
});
const { value: name } = useField<string>('name');

// (Re)seed the form whenever the modal opens for a new target.
watch(
  () => [open.value, props.role?.id] as const,
  () => {
    if (!open.value) return;
    resetForm({ values: { name: props.role?.name ?? '' } });
  },
  { immediate: true },
);

const inputClass =
  'h-10 w-full rounded-sm border border-outline bg-transparent px-4 font-mono text-sm uppercase tracking-wide text-foreground placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-on-surface-variant/85 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
const ERROR_CLASS = 'border-destructive focus:border-destructive focus:ring-destructive';

const onSubmit = handleSubmit(async (values) => {
  try {
    if (isEdit.value && props.role) {
      await update.mutateAsync({ id: props.role.id, body: values });
    } else {
      await create.mutateAsync(values);
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
    :title="isEdit ? $t('roles.form.editTitle') : $t('roles.form.newTitle')"
    :description="isEdit ? $t('roles.form.editDesc') : $t('roles.form.newDesc')"
  >
    <form class="space-y-5" @submit="onSubmit">
      <Fieldset
        name="name"
        :label="$t('roles.form.name')"
        :error="errors.name"
        :hint="locked ? $t('roles.protected') : $t('roles.form.nameHint')"
      >
        <template #default="{ id, describedBy, invalid }">
          <input
            :id="id"
            v-model="name"
            type="text"
            placeholder="CONTENT_EDITOR"
            :disabled="locked"
            :aria-describedby="describedBy"
            :aria-invalid="invalid"
            :class="cn(inputClass, locked && 'opacity-60', invalid && ERROR_CLASS)"
            autocomplete="off"
            spellcheck="false"
          />
        </template>
      </Fieldset>

      <div class="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" @click="open = false">{{
          $t('roles.form.cancel')
        }}</Button>
        <Button type="submit" :disabled="pending || locked">
          {{
            pending
              ? $t('roles.form.saving')
              : isEdit
                ? $t('roles.form.saveChanges')
                : $t('roles.form.createRole')
          }}
        </Button>
      </div>
    </form>
  </Modal>
</template>
