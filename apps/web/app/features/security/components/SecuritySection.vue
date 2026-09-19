<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { startRegistration } from '@simplewebauthn/browser';
import { toast } from 'vue-sonner';
import { useConfirm } from '~/composables/useConfirm';
import { useAuthStore } from '~/stores/auth';
import { useSecurityApi } from '../api/security.api';
import type { Passkey } from '../types';

/**
 * Account security: TOTP status + recovery-code regeneration, and (when the
 * passkey flag is on) registered passkeys. The forced TOTP *setup* itself lives
 * on /two-factor/setup — this card only manages an already-active account.
 */
const { t } = useI18n();
const auth = useAuthStore();
const config = useRuntimeConfig();
const queryClient = useQueryClient();
const securityApi = useSecurityApi();
const { confirm } = useConfirm();

const twoFactorEnabled = computed(() => config.public.twoFactorEnabled as boolean);
const passkeyEnabled = computed(() => config.public.passkeyEnabled as boolean);
const twoFactorActive = computed(() => auth.user?.twoFactorEnabled === true);

const PASSKEYS_KEY = ['passkeys'] as const;
const {
  data: passkeys,
  isLoading: passkeysLoading,
  isError: passkeysError,
  error: passkeysErr,
  refetch: refetchPasskeys,
} = useQuery<Passkey[]>({
  queryKey: PASSKEYS_KEY,
  queryFn: () => securityApi.listPasskeys(),
  enabled: () => passkeyEnabled.value && auth.isAuthenticated,
});

// ── Recovery codes regeneration (password-confirmed) ────────────────────────
const regenOpen = ref(false);
const regenCodes = ref<string[] | null>(null);
const regenSubmitting = ref(false);

// Codes stay on screen while the modal is open, then are forgotten forever.
watch(regenOpen, (open) => {
  if (!open) regenCodes.value = null;
});

const regenSchema = toTypedSchema(
  z.object({ password: z.string().min(6, 'Password must be at least 6 characters') }),
);
const { handleSubmit: handleRegenSubmit, resetForm: resetRegenForm } = useForm({
  validationSchema: regenSchema,
  initialValues: { password: '' },
});

const onRegenSubmit = handleRegenSubmit(async (values) => {
  regenSubmitting.value = true;
  try {
    regenCodes.value = await securityApi.regenerateRecoveryCodes(values.password);
    resetRegenForm();
    toast.success(t('security.recovery.regenerated'));
  } catch (err) {
    toast.error((err as Error)?.message || t('security.recovery.failed'));
  } finally {
    regenSubmitting.value = false;
  }
});

const copyCodes = async () => {
  if (!regenCodes.value) return;
  await navigator.clipboard.writeText(regenCodes.value.join('\n'));
  toast.success(t('security.recovery.copied'));
};

// ── Passkey management ───────────────────────────────────────────────────────
const addOpen = ref(false);
const passkeyName = ref('');
const addBusy = ref(false);

async function addPasskey() {
  addBusy.value = true;
  try {
    const optionsJSON = await securityApi.passkeyRegisterOptions();
    const attestation = await startRegistration({ optionsJSON });
    await securityApi.passkeyRegisterVerify(passkeyName.value.trim() || undefined, attestation);
    await queryClient.invalidateQueries({ queryKey: [...PASSKEYS_KEY] });
    toast.success(t('security.passkeys.added'));
    addOpen.value = false;
    passkeyName.value = '';
  } catch (err) {
    // A dismissed browser prompt is a user choice, not a failure.
    if ((err as Error)?.name === 'NotAllowedError') return;
    toast.error((err as Error)?.message || t('security.passkeys.addFailed'));
  } finally {
    addBusy.value = false;
  }
}

const removeBusy = ref<string | null>(null);
async function removePasskey(passkey: Passkey) {
  const label = passkey.name || t('security.passkeys.unnamed');
  const ok = await confirm({
    title: t('security.passkeys.removeTitle'),
    description: t('security.passkeys.removeDescription', { name: label }),
    destructive: true,
  });
  if (!ok) return;
  removeBusy.value = passkey.id;
  try {
    await securityApi.removePasskey(passkey.id);
    await queryClient.invalidateQueries({ queryKey: [...PASSKEYS_KEY] });
    toast.success(t('security.passkeys.removed'));
  } catch (err) {
    toast.error((err as Error)?.message || t('security.passkeys.removeFailed'));
  } finally {
    removeBusy.value = null;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Two-factor (TOTP) -->
    <div
      v-if="twoFactorEnabled"
      class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6"
    >
      <div class="mb-1 flex items-start justify-between gap-4">
        <div>
          <h3 class="text-base font-semibold text-foreground">
            {{ $t('security.twoFactor.title') }}
          </h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ $t('security.twoFactor.subtitle') }}</p>
        </div>
        <Badge :variant="twoFactorActive ? 'success' : 'warning'">
          {{ twoFactorActive ? $t('security.twoFactor.active') : $t('security.twoFactor.pending') }}
        </Badge>
      </div>

      <div v-if="twoFactorActive" class="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted-foreground">{{ $t('security.recovery.subtitle') }}</p>
        <Button
          variant="outline"
          data-testid="regenerate-recovery-button"
          @click="regenOpen = true"
        >
          {{ $t('security.recovery.regenerate') }}
        </Button>
      </div>
      <div v-else class="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted-foreground">{{ $t('security.twoFactor.incomplete') }}</p>
        <Button data-testid="complete-2fa-button" @click="navigateTo('/two-factor/setup')">
          {{ $t('security.twoFactor.setUp') }}
        </Button>
      </div>
    </div>

    <!-- Passkeys -->
    <div v-if="passkeyEnabled" class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <div class="mb-1 flex items-start justify-between gap-4">
        <div>
          <h3 class="text-base font-semibold text-foreground">
            {{ $t('security.passkeys.title') }}
          </h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ $t('security.passkeys.subtitle') }}</p>
        </div>
        <Button variant="outline" data-testid="add-passkey-button" @click="addOpen = true">
          <MaterialSymbol name="add" :size="18" />
          {{ $t('security.passkeys.add') }}
        </Button>
      </div>

      <LoadingState v-if="passkeysLoading" />
      <ErrorState
        v-else-if="passkeysError"
        :message="(passkeysErr as Error)?.message"
        @retry="refetchPasskeys()"
      />
      <EmptyState v-else-if="!passkeys?.length" :title="$t('security.passkeys.empty')" />
      <ul v-else class="mt-5 divide-y divide-outline-variant">
        <li
          v-for="p in passkeys"
          :key="p.id"
          class="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-foreground" data-testid="passkey-name">
              {{ p.name || $t('security.passkeys.unnamed') }}
            </p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              {{
                p.lastUsedAt
                  ? $t('security.passkeys.lastUsed', { date: formatDate(p.lastUsedAt) })
                  : $t('security.passkeys.neverUsed')
              }}
              · {{ $t('security.passkeys.addedOn', { date: formatDate(p.createdAt) }) }}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            :aria-label="$t('security.passkeys.remove')"
            :disabled="removeBusy === p.id"
            @click="removePasskey(p)"
          >
            <MaterialSymbol name="delete" :size="18" class="text-destructive" />
          </Button>
        </li>
      </ul>
    </div>

    <!-- Regenerate recovery codes -->
    <Modal v-model:open="regenOpen" :title="$t('security.recovery.title')">
      <div v-if="regenCodes">
        <p class="mb-3 text-sm text-muted-foreground">{{ $t('security.recovery.showOnce') }}</p>
        <div
          class="grid grid-cols-2 gap-2 rounded-lg bg-surface-container p-4 font-mono text-sm text-foreground"
        >
          <span v-for="code in regenCodes" :key="code" class="select-none">{{ code }}</span>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <Button variant="outline" @click="copyCodes">{{ $t('security.recovery.copy') }}</Button>
          <Button @click="regenOpen = false">{{ $t('common.done') }}</Button>
        </div>
      </div>
      <form v-else class="space-y-5" @submit="onRegenSubmit">
        <p class="text-sm text-muted-foreground">{{ $t('security.recovery.description') }}</p>
        <PasswordField
          name="password"
          :label="$t('security.recovery.password')"
          placeholder="••••••••"
          autocomplete="current-password"
          required
        />
        <div class="flex justify-end gap-2">
          <Button type="button" variant="ghost" @click="regenOpen = false">
            {{ $t('common.cancel') }}
          </Button>
          <Button type="submit" :disabled="regenSubmitting">
            {{ regenSubmitting ? $t('common.working') : $t('security.recovery.regenerate') }}
          </Button>
        </div>
      </form>
    </Modal>

    <!-- Add passkey -->
    <Modal
      v-model:open="addOpen"
      :title="$t('security.passkeys.addTitle')"
      :description="$t('security.passkeys.addDescription')"
    >
      <form class="space-y-5" @submit.prevent="addPasskey">
        <div class="space-y-1.5">
          <label for="passkey-name" class="text-sm font-medium leading-none">
            {{ $t('security.passkeys.nameLabel') }}
          </label>
          <Input
            id="passkey-name"
            v-model="passkeyName"
            :placeholder="$t('security.passkeys.namePlaceholder')"
            maxlength="64"
          />
          <p class="text-xs text-on-surface-variant">{{ $t('security.passkeys.nameHint') }}</p>
        </div>
        <div class="flex justify-end gap-2">
          <Button type="button" variant="ghost" :disabled="addBusy" @click="addOpen = false">
            {{ $t('common.cancel') }}
          </Button>
          <Button type="submit" :disabled="addBusy">
            {{ addBusy ? $t('common.working') : $t('security.passkeys.continue') }}
          </Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
