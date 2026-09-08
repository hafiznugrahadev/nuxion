<script setup lang="ts">
import { computed } from 'vue';
import type { NuxtError } from '#app';
import { APP_NAME } from '~/lib/constants';

const props = defineProps<{ error: NuxtError }>();
const { t } = useI18n();

const is404 = computed(() => props.error?.statusCode === 404);
const title = computed(() => (is404.value ? t('error.notFound') : t('error.generic')));
const description = computed(() =>
  is404.value ? t('error.notFoundDesc') : props.error?.statusMessage || t('error.genericDesc'),
);

useHead({ title: `${props.error?.statusCode ?? 'Error'} · ${APP_NAME}` });
</script>

<template>
  <div
    class="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center"
  >
    <p class="text-7xl font-bold tracking-tight text-primary sm:text-8xl">
      {{ error.statusCode || 500 }}
    </p>
    <div class="space-y-2">
      <h1 class="text-2xl font-semibold text-foreground">{{ title }}</h1>
      <p class="max-w-md text-sm text-muted-foreground">{{ description }}</p>
    </div>
    <Button size="lg" @click="clearError({ redirect: '/' })">{{ $t('error.backHome') }}</Button>
  </div>
</template>
