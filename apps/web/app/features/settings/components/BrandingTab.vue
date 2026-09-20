<script setup lang="ts">
import { ref } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { toast } from 'vue-sonner';
import { useUpload } from '~/composables/useUpload';
import { useAuthStore } from '~/stores/auth';
import { useBrandingSettings, useUpdateBranding } from '../composables/useSettings';

/**
 * Branding group editor: app name + logo/favicon uploads (avatar-picker
 * pattern — the file uploads immediately, the returned URL sits in the form
 * until Save persists it). Read-only for anyone below Super Admin.
 */
const { t } = useI18n();
const auth = useAuthStore();
const canEdit = computed(() => auth.isSuperAdmin);

const { data, isLoading, isError, error, refetch } = useBrandingSettings();
const update = useUpdateBranding();
const { uploadFile } = useUpload();

const schema = toTypedSchema(
  z.object({
    appName: z.string().min(2, 'Name must be at least 2 characters').max(50),
    logoUrl: z.string().url().nullable().optional(),
    faviconUrl: z.string().url().nullable().optional(),
  }),
);
const { handleSubmit, setFieldValue, values } = useForm({
  validationSchema: schema,
  initialValues: {
    appName: data.value?.appName ?? '',
    logoUrl: data.value?.logoUrl ?? null,
    faviconUrl: data.value?.faviconUrl ?? null,
  },
});
// Track server-side edits to the initial values (e.g. another admin saved).
watchEffect(() => {
  if (data.value) {
    setFieldValue('appName', data.value.appName, false);
    setFieldValue('logoUrl', data.value.logoUrl, false);
    setFieldValue('faviconUrl', data.value.faviconUrl, false);
  }
});

const submitting = ref(false);
const onSubmit = handleSubmit(async (form) => {
  submitting.value = true;
  try {
    await update.mutateAsync({
      appName: form.appName.trim(),
      logoUrl: form.logoUrl ?? null,
      faviconUrl: form.faviconUrl ?? null,
    });
  } finally {
    submitting.value = false;
  }
});

// ── Logo / favicon pickers (upload now, persist on Save) ─────────────────────
const MAX_MB = 5;
const logoInput = ref<HTMLInputElement | null>(null);
const faviconInput = ref<HTMLInputElement | null>(null);
const uploading = ref<'logo' | 'favicon' | null>(null);

async function pick(kind: 'logo' | 'favicon', event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // allow re-picking the same file
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast.error(t('settings.branding.notImage'));
    return;
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    toast.error(t('settings.branding.tooLarge', { mb: MAX_MB }));
    return;
  }

  uploading.value = kind;
  try {
    const uploaded = await uploadFile(file, 'branding');
    setFieldValue(kind === 'logo' ? 'logoUrl' : 'faviconUrl', uploaded.url);
    toast.success(t('settings.branding.uploaded'));
  } catch (err) {
    toast.error((err as Error)?.message || t('settings.branding.uploadFailed'));
  } finally {
    uploading.value = null;
  }
}

const clearAsset = (field: 'logoUrl' | 'faviconUrl') => setFieldValue(field, null);
</script>

<template>
  <div class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
    <div class="mb-1">
      <h3 class="text-base font-semibold text-foreground">
        {{ $t('settings.branding.title') }}
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">{{ $t('settings.branding.subtitle') }}</p>
    </div>

    <LoadingState v-if="isLoading && !data" />
    <ErrorState v-else-if="isError" :message="(error as Error)?.message" @retry="refetch()" />

    <form v-else class="mt-5 space-y-6" @submit="onSubmit">
      <div class="max-w-md">
        <TextField
          name="appName"
          :label="$t('settings.branding.appName')"
          :placeholder="data?.appName ?? 'Nuxion'"
          :disabled="!canEdit"
          required
        />
      </div>

      <!-- Logo -->
      <div class="flex flex-wrap items-center gap-4">
        <div
          class="flex h-16 w-32 items-center justify-center rounded-lg border border-outline-variant bg-surface-container"
        >
          <img
            v-if="values.logoUrl"
            :src="values.logoUrl"
            :alt="$t('settings.branding.logoAlt')"
            class="max-h-12 max-w-28 object-contain"
            data-testid="branding-logo-preview"
          />
          <BrandLogo v-else class="h-12" />
        </div>
        <div class="space-y-1">
          <div class="flex gap-2">
            <Button
              type="button"
              variant="outline"
              :disabled="!canEdit || uploading === 'logo'"
              @click="logoInput?.click()"
            >
              {{ uploading === 'logo' ? $t('common.working') : $t('settings.branding.uploadLogo') }}
            </Button>
            <Button
              v-if="values.logoUrl"
              type="button"
              variant="ghost"
              :disabled="!canEdit"
              @click="clearAsset('logoUrl')"
            >
              {{ $t('settings.branding.useDefault') }}
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">{{ $t('settings.branding.logoHint') }}</p>
        </div>
        <input
          ref="logoInput"
          type="file"
          accept="image/*"
          class="hidden"
          :aria-label="$t('settings.branding.uploadLogo')"
          @change="pick('logo', $event)"
        />
      </div>

      <!-- Favicon -->
      <div class="flex flex-wrap items-center gap-4">
        <div
          class="flex h-16 w-32 items-center justify-center rounded-lg border border-outline-variant bg-surface-container"
        >
          <img
            v-if="values.faviconUrl"
            :src="values.faviconUrl"
            :alt="$t('settings.branding.faviconAlt')"
            class="h-8 w-8 rounded-sm object-contain"
            data-testid="branding-favicon-preview"
          />
          <img v-else src="/favicon.png" alt="" class="h-8 w-8 rounded-sm" />
        </div>
        <div class="space-y-1">
          <div class="flex gap-2">
            <Button
              type="button"
              variant="outline"
              :disabled="!canEdit || uploading === 'favicon'"
              @click="faviconInput?.click()"
            >
              {{
                uploading === 'favicon'
                  ? $t('common.working')
                  : $t('settings.branding.uploadFavicon')
              }}
            </Button>
            <Button
              v-if="values.faviconUrl"
              type="button"
              variant="ghost"
              :disabled="!canEdit"
              @click="clearAsset('faviconUrl')"
            >
              {{ $t('settings.branding.useDefault') }}
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">{{ $t('settings.branding.faviconHint') }}</p>
        </div>
        <input
          ref="faviconInput"
          type="file"
          accept="image/*"
          class="hidden"
          :aria-label="$t('settings.branding.uploadFavicon')"
          @change="pick('favicon', $event)"
        />
      </div>

      <div class="flex items-center justify-between gap-4">
        <p v-if="!canEdit" class="text-xs text-muted-foreground">
          {{ $t('settings.branding.superAdminOnly') }}
        </p>
        <Button
          type="submit"
          class="ml-auto"
          :disabled="!canEdit || submitting || update.isPending.value"
          data-testid="save-branding-button"
        >
          {{
            submitting || update.isPending.value
              ? $t('settings.branding.saving')
              : $t('settings.branding.save')
          }}
        </Button>
      </div>
    </form>
  </div>
</template>
