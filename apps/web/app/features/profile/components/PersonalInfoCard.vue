<script setup lang="ts">
import { applyApiFieldErrors } from '~/lib/api-errors';
import { ref } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import type { User } from '@nuxion/shared-types';
import { roleLabel } from '~/lib/roles';
import { useUpdateProfile } from '../composables/useProfile';

const props = defineProps<{ user: User }>();

const editing = ref(false);
const update = useUpdateProfile();

const schema = toTypedSchema(
  z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
  }),
);

const { handleSubmit, resetForm, setErrors } = useForm({
  validationSchema: schema,
  initialValues: { name: props.user.name },
});

function startEdit() {
  resetForm({ values: { name: props.user.name } });
  editing.value = true;
}

const onSubmit = handleSubmit(async (values) => {
  try {
    await update.mutateAsync({ name: values.name });
    editing.value = false;
  } catch (err) {
    applyApiFieldErrors(err, setErrors, ['name']);
  }
});
</script>

<template>
  <div class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
    <div class="mb-5 flex items-center justify-between gap-3">
      <h3 class="text-base font-semibold text-foreground">
        {{ $t('profile.personalInfo.title') }}
      </h3>
      <Button v-if="!editing" variant="outline" size="sm" @click="startEdit">
        <MaterialSymbol name="edit" :size="18" />
        {{ $t('profile.personalInfo.edit') }}
      </Button>
    </div>

    <!-- Read-only view -->
    <dl v-if="!editing" class="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
      <div>
        <dt class="text-xs font-medium text-muted-foreground">
          {{ $t('profile.personalInfo.fullName') }}
        </dt>
        <dd class="mt-1 text-sm font-medium text-foreground">{{ user.name }}</dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-muted-foreground">
          {{ $t('profile.personalInfo.emailAddress') }}
        </dt>
        <dd class="mt-1 text-sm font-medium text-foreground">{{ user.email }}</dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-muted-foreground">
          {{ $t('profile.personalInfo.roles') }}
        </dt>
        <dd class="mt-1 flex flex-wrap gap-1.5">
          <Badge v-for="role in user.roles" :key="role" variant="muted">{{
            roleLabel(role, $t)
          }}</Badge>
        </dd>
      </div>
    </dl>

    <!-- Edit form -->
    <form v-else class="space-y-5" @submit="onSubmit">
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          name="name"
          :label="$t('profile.personalInfo.fullName')"
          placeholder="Your name"
        />
        <Fieldset
          name="profile-email"
          :label="$t('profile.personalInfo.emailAddress')"
          :hint="$t('profile.personalInfo.emailHint')"
        >
          <template #default="{ id, describedBy, invalid }">
            <Input
              :id="id"
              :model-value="user.email"
              disabled
              class="cursor-not-allowed opacity-70"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            />
          </template>
        </Fieldset>
      </div>

      <div class="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          :disabled="update.isPending.value"
          @click="editing = false"
        >
          {{ $t('profile.personalInfo.cancel') }}
        </Button>
        <Button type="submit" :disabled="update.isPending.value">
          {{
            update.isPending.value
              ? $t('profile.personalInfo.saving')
              : $t('profile.personalInfo.saveChanges')
          }}
        </Button>
      </div>
    </form>
  </div>
</template>
