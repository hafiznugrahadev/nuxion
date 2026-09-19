<script setup lang="ts">
import { ref } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { toast } from 'vue-sonner';
import { useAuthStore } from '~/stores/auth';

/**
 * Second login step: consume a 2FA challenge with a 6-digit TOTP code or a
 * XXXXX-XXXXX recovery code. Separate component so it owns its own vee-validate
 * form context — a page must never run two useForm() scopes at once.
 */
const props = defineProps<{ challengeId: string }>();
const emit = defineEmits<{ verified: []; back: [] }>();

const { t } = useI18n();
const auth = useAuthStore();
const submitting = ref(false);
const useRecoveryCode = ref(false);

const schema = toTypedSchema(
  z.object({
    code: z.string().min(6, 'Code must be at least 6 characters').max(11),
  }),
);
const { handleSubmit } = useForm({ validationSchema: schema, initialValues: { code: '' } });

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true;
  try {
    await auth.verifyTwoFactor(props.challengeId, values.code.trim());
    emit('verified');
  } catch {
    toast.error(t('auth.twoFactor.invalidCode'));
  } finally {
    submitting.value = false;
  }
});
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {{ $t('auth.twoFactor.title') }}
      </h1>
      <p class="mt-2 text-sm text-muted-foreground">
        {{
          useRecoveryCode ? $t('auth.twoFactor.recoverySubtitle') : $t('auth.twoFactor.subtitle')
        }}
      </p>
    </div>

    <form class="space-y-5" @submit="onSubmit">
      <TextField
        name="code"
        :label="useRecoveryCode ? $t('auth.twoFactor.recoveryCode') : $t('auth.twoFactor.code')"
        :placeholder="useRecoveryCode ? 'XXXXX-XXXXX' : '123456'"
        :inputmode="useRecoveryCode ? 'text' : 'numeric'"
        :maxlength="useRecoveryCode ? 11 : 6"
        autocomplete="one-time-code"
        required
      />

      <Button type="submit" size="lg" class="w-full" :disabled="submitting">
        {{ submitting ? $t('auth.signingIn') : $t('auth.signIn') }}
      </Button>
    </form>

    <div class="mt-4 space-y-2 text-center text-sm">
      <button
        type="button"
        class="font-medium text-primary hover:underline"
        @click="useRecoveryCode = !useRecoveryCode"
      >
        {{ useRecoveryCode ? $t('auth.twoFactor.useTotp') : $t('auth.twoFactor.useRecovery') }}
      </button>
      <div>
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground hover:underline"
          @click="emit('back')"
        >
          {{ $t('auth.twoFactor.back') }}
        </button>
      </div>
    </div>
  </div>
</template>
