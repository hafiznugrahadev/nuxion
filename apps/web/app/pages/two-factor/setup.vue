<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { toast } from 'vue-sonner';
import { useSecurityApi, type TwoFactorSetupPayload } from '~/features/security';
import { useAuthStore } from '~/stores/auth';
import { intendedRedirect } from '~/lib/intended-redirect';
import { APP_NAME } from '~/lib/constants';

/**
 * Forced TOTP setup. When AUTH_2FA_ENABLED is on, the auth middleware keeps
 * every un-activated user on this page (it's the one exempt route). The escape
 * hatch is signing out — activation itself is the only way forward.
 */
definePageMeta({ layout: 'auth', middleware: ['auth'] });
useHead({ title: `Two-Factor Setup · ${APP_NAME}` });

const { t } = useI18n();
const auth = useAuthStore();
const route = useRoute();
const securityApi = useSecurityApi();

const setupData = ref<TwoFactorSetupPayload | null>(null);
const recoveryCodes = ref<string[] | null>(null);
const loading = ref(true);
const activating = ref(false);
const loadError = ref<string | null>(null);

onMounted(async () => {
  // Already activated (e.g. this URL was revisited) — nothing to do here.
  if (auth.user?.twoFactorEnabled) {
    await navigateTo(intendedRedirect(route.query), { replace: true });
    return;
  }
  try {
    setupData.value = await securityApi.twoFactorSetup();
  } catch (err) {
    loadError.value = (err as Error)?.message || 'Could not start setup';
  } finally {
    loading.value = false;
  }
});

const schema = toTypedSchema(
  z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your app') }),
);
const { handleSubmit } = useForm({ validationSchema: schema, initialValues: { code: '' } });

const onSubmit = handleSubmit(async (values) => {
  if (!setupData.value) return;
  activating.value = true;
  try {
    const result = await securityApi.twoFactorActivate(values.code);
    recoveryCodes.value = result.recoveryCodes;
    if (auth.user) auth.user = { ...auth.user, twoFactorEnabled: true };
    toast.success(t('auth.twoFactor.activated'));
  } catch (err) {
    toast.error((err as Error)?.message || t('auth.twoFactor.invalidCode'));
  } finally {
    activating.value = false;
  }
});

const copyCodes = async () => {
  if (!recoveryCodes.value) return;
  await navigator.clipboard.writeText(recoveryCodes.value.join('\n'));
  toast.success(t('security.recovery.copied'));
};

const finish = () => navigateTo(intendedRedirect(route.query));

const signingOut = ref(false);
const signOut = async () => {
  signingOut.value = true;
  await auth.logout();
  await navigateTo('/login');
};
</script>

<template>
  <div>
    <!-- Activated: recovery codes, shown exactly once -->
    <div v-if="recoveryCodes">
      <div class="mb-8">
        <h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {{ $t('auth.twoFactor.activatedTitle') }}
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">{{ $t('security.recovery.showOnce') }}</p>
      </div>

      <div
        class="grid grid-cols-2 gap-2 rounded-lg bg-surface-container p-4 font-mono text-sm text-foreground"
      >
        <span
          v-for="code in recoveryCodes"
          :key="code"
          class="select-none"
          data-testid="recovery-code"
          >{{ code }}</span
        >
      </div>

      <div class="mt-6 grid grid-cols-1 gap-3">
        <Button variant="outline" size="lg" @click="copyCodes">
          {{ $t('security.recovery.copy') }}
        </Button>
        <Button size="lg" data-testid="finish-setup-button" @click="finish">
          {{ $t('auth.twoFactor.continue') }}
        </Button>
      </div>
    </div>

    <!-- Setup: QR + code confirmation -->
    <div v-else>
      <div class="mb-8">
        <h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {{ $t('auth.twoFactor.setupTitle') }}
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">{{ $t('auth.twoFactor.setupSubtitle') }}</p>
      </div>

      <LoadingState v-if="loading" />
      <div v-else-if="loadError" class="space-y-4">
        <p class="text-sm text-destructive">{{ loadError }}</p>
        <Button variant="outline" @click="signOut">{{ $t('auth.twoFactor.signOut') }}</Button>
      </div>

      <div v-else-if="setupData" class="space-y-6">
        <ol class="space-y-1 text-sm text-muted-foreground">
          <li>1. {{ $t('auth.twoFactor.stepScan') }}</li>
          <li>2. {{ $t('auth.twoFactor.stepEnter') }}</li>
        </ol>

        <div class="flex flex-col items-center gap-3">
          <img
            :src="setupData.qrDataUrl"
            :alt="$t('auth.twoFactor.qrAlt')"
            class="h-44 w-44 rounded-lg border border-outline-variant bg-white p-2"
            data-testid="totp-qr"
          />
          <p class="text-xs text-muted-foreground">
            {{ $t('auth.twoFactor.manualSecret') }}
            <span class="select-all font-mono text-foreground" data-testid="totp-secret">{{
              setupData.secret
            }}</span>
          </p>
        </div>

        <form class="space-y-5" @submit="onSubmit">
          <TextField
            name="code"
            :label="$t('auth.twoFactor.code')"
            placeholder="123456"
            inputmode="numeric"
            :maxlength="6"
            autocomplete="one-time-code"
            required
          />

          <Button
            type="submit"
            size="lg"
            class="w-full"
            :disabled="activating"
            data-testid="activate-2fa-button"
          >
            {{ activating ? $t('common.working') : $t('auth.twoFactor.activate') }}
          </Button>
        </form>
      </div>

      <p class="mt-6 text-center text-sm">
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground hover:underline"
          :disabled="signingOut"
          @click="signOut"
        >
          {{ $t('auth.twoFactor.signOut') }}
        </button>
      </p>
    </div>
  </div>
</template>
