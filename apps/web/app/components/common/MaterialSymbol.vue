<script setup lang="ts">
/*
 * Material Symbols Outlined icon. The Google Fonts stylesheet (see
 * nuxt.config) provides the `material-symbols-outlined` ligature class;
 * `display=block` on that link keeps icon names from flashing as raw text
 * while the font loads. Decorative by contract: interactive elements own
 * their accessible names, so the glyph is aria-hidden here.
 */
withDefaults(defineProps<{ name: string; size?: number; fill?: boolean }>(), {
  size: 20,
  fill: false,
});
</script>

<template>
  <span
    class="material-symbols-outlined inline-flex select-none leading-none"
    :style="{ fontSize: `${size}px`, fontVariationSettings: `'FILL' ${fill ? 1 : 0}` }"
    aria-hidden="true"
  >
    {{ name }}
  </span>
</template>
