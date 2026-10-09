<script setup lang="ts">
import { apiFieldErrors } from '~/lib/api-errors';
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import type { User } from '@nuxion/shared-types';
import { roleLabel } from '~/lib/roles';
import { useUpload } from '~/composables/useUpload';
import { useUpdateProfile } from '../composables/useProfile';

const { t } = useI18n();

const props = defineProps<{ user: User }>();

const initials = computed(() => {
  const name = props.user.name?.trim();
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
});

const primaryRole = computed(() => props.user.roles?.[0] ?? 'USER');

// ── Avatar upload: pick → upload to /files → PATCH /users/me with the URL ──────
const { uploadFile } = useUpload();
const update = useUpdateProfile();
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const avatarError = ref<string>();

const MAX_MB = 5;

async function onPick(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  avatarError.value = undefined;
  if (!file.type.startsWith('image/')) {
    avatarError.value = t('profile.avatar.notImage');
    toast.error(avatarError.value);
    return;
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    avatarError.value = t('profile.avatar.tooLarge', { mb: MAX_MB });
    toast.error(avatarError.value);
    return;
  }

  uploading.value = true;
  try {
    const { url } = await uploadFile(file, 'avatars');
    await update.mutateAsync({ avatarUrl: url }).catch((err) => {
      avatarError.value = apiFieldErrors(err).avatarUrl;
    });
  } catch (err) {
    avatarError.value =
      apiFieldErrors(err).file || (err as Error)?.message || t('profile.avatar.uploadFailed');
    toast.error(avatarError.value);
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}
</script>

<template>
  <div class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
    <div class="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <!-- Avatar with upload affordance -->
      <Fieldset name="profile-avatar" :error="avatarError" class="shrink-0 sm:max-w-44">
        <template #default="{ id, describedBy, invalid }">
          <div class="relative h-20 w-20">
            <img
              v-if="user.avatarUrl"
              :src="user.avatarUrl"
              :alt="user.name"
              class="h-20 w-20 rounded-full object-cover"
            />
            <span
              v-else
              class="flex h-20 w-20 items-center justify-center rounded-full bg-primary-container text-2xl font-semibold text-on-primary-container"
            >
              {{ initials }}
            </span>

            <!-- MD3 small FAB (primary-container) -->
            <button
              type="button"
              class="state-layer touch-target absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-card bg-primary-container text-on-primary-container shadow disabled:opacity-60 [--touch-slop:-6px]"
              :disabled="uploading"
              :aria-label="uploading ? $t('common.working') : $t('profile.avatar.change')"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
              @click="fileInput?.click()"
            >
              <MaterialSymbol
                v-if="uploading"
                name="progress_activity"
                :size="14"
                class="animate-spin"
              />
              <MaterialSymbol v-else name="photo_camera" :size="14" />
            </button>
            <input
              :id="id"
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              :disabled="uploading"
              :aria-label="$t('profile.avatar.change')"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
              @change="onPick"
            />
          </div>
        </template>
      </Fieldset>

      <div class="flex-1 text-center sm:text-left">
        <h2 class="text-lg font-semibold text-foreground">{{ user.name }}</h2>
        <div
          class="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground sm:justify-start"
        >
          <span class="inline-flex items-center gap-1.5">
            <MaterialSymbol name="shield" :size="18" />
            {{ roleLabel(primaryRole, $t) }}
          </span>
          <span class="inline-flex items-center gap-1.5">
            <MaterialSymbol name="mail" :size="18" />
            {{ user.email }}
          </span>
        </div>
      </div>

      <div class="flex flex-wrap justify-center gap-2 sm:justify-end">
        <Badge v-for="role in user.roles" :key="role" variant="muted">{{
          roleLabel(role, $t)
        }}</Badge>
      </div>
    </div>
  </div>
</template>
