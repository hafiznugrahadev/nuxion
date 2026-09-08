<script setup lang="ts">
import { computed, ref } from 'vue';

const { locale, locales, setLocale } = useI18n();
const open = ref(false);

const available = computed(() => locales.value as Array<{ code: string; name: string }>);
const current = computed(() => locale.value.toUpperCase());

async function choose(code: string) {
  await setLocale(code as never);
  open.value = false;
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      data-testid="language-switcher"
      class="touch-target relative inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground"
      :aria-label="$t('language')"
      @click="open = !open"
    >
      <MaterialSymbol name="translate" :size="18" />
      <span>{{ current }}</span>
    </button>

    <template v-if="open">
      <button class="fixed inset-0 z-40 cursor-default" @click="open = false" />
      <div
        class="absolute right-0 top-full z-50 mt-2 min-w-[12rem] overflow-hidden rounded-md bg-surface-container-high p-1.5 shadow-theme-md"
      >
        <button
          v-for="l in available"
          :key="l.code"
          class="flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm text-foreground transition-colors hover:bg-on-surface-variant/10"
          @click="choose(l.code)"
        >
          {{ l.name }}
          <MaterialSymbol v-if="l.code === locale" name="check" :size="18" class="text-primary" />
        </button>
      </div>
    </template>
  </div>
</template>
