<script setup lang="ts">
import { computed, ref } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { toast } from 'vue-sonner';
import { useAuthStore } from '~/stores/auth';
import { APP_NAME } from '~/lib/constants';

definePageMeta({ layout: 'auth' });
const { t } = useI18n();
useHead({ title: `Sign Up · ${APP_NAME}` });

const auth = useAuthStore();
const config = useRuntimeConfig();
const enabled = computed(() => config.public.registrationEnabled as boolean);
const submitting = ref(false);

const schema = toTypedSchema(
  z.object({
    name: z.string().min(2, 'Enter your name'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
);
const { handleSubmit } = useForm({ validationSchema: schema });

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true;
  try {
    await auth.register(values.name, values.email, values.password);
    toast.success(t('auth.welcomeAboard'));
    await navigateTo('/admin/dashboard');
  } catch (err) {
    const message = (err as { data?: { message?: string } })?.data?.message;
    toast.error(message || t('auth.createAccountError'));
  } finally {
    submitting.value = false;
  }
});
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {{ $t('auth.registerTitle') }}
      </h1>
      <p class="mt-2 text-sm text-muted-foreground">{{ $t('auth.registerSubtitle') }}</p>
    </div>

    <!-- Registration disabled -->
    <div v-if="!enabled" class="space-y-3 rounded-lg bg-surface-container p-5 text-sm">
      <p class="text-foreground">{{ $t('auth.registrationDisabled') }}</p>
      <NuxtLink to="/login" class="inline-block font-medium text-primary hover:underline">
        {{ $t('auth.backToSignIn') }}
      </NuxtLink>
    </div>

    <!-- Sign-up form -->
    <form v-else class="space-y-5" @submit="onSubmit">
      <TextField name="name" :label="$t('auth.fullName')" placeholder="Full name" required />
      <TextField
        name="email"
        :label="$t('auth.email')"
        type="email"
        placeholder="name@example.com"
        required
      />
      <PasswordField
        name="password"
        :label="$t('auth.password')"
        placeholder="••••••••"
        autocomplete="new-password"
        required
      />
      <Button type="submit" size="lg" class="w-full" :disabled="submitting">
        {{ submitting ? $t('auth.creatingAccount') : $t('auth.createAccount') }}
      </Button>
      <p class="text-center text-sm text-muted-foreground">
        {{ $t('auth.haveAccount') }}
        <NuxtLink to="/login" class="font-medium text-primary hover:underline">
          {{ $t('auth.signIn') }}
        </NuxtLink>
      </p>
    </form>
  </div>
</template>
