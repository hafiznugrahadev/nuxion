<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef, ref } from 'vue';
import { cn } from '~/lib/utils';

const props = defineProps<{
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  /** Material Symbols name for a leading glyph (e.g. 'lock'). */
  prefixIcon?: string;
  /** MD3 supporting text below the field; the error replaces it when present. */
  hint?: string;
  /** Passed through for password managers ('current-password' | 'new-password'). */
  autocomplete?: string;
}>();

const { t } = useI18n();
const { value, errorMessage } = useField<string>(toRef(props, 'name'));
const show = ref(false);
</script>

<template>
  <Fieldset :name="name" :label="label" :required="required" :error="errorMessage" :hint="hint">
    <template #default="{ describedBy, invalid }">
      <div class="relative">
        <Input
          :id="name"
          v-model="value"
          :type="show ? 'text' : 'password'"
          :placeholder="placeholder"
          :prefix-icon="prefixIcon"
          :autocomplete="autocomplete"
          :aria-describedby="describedBy"
          :aria-invalid="invalid"
          :class="
            cn(
              'pr-12',
              errorMessage && 'border-destructive focus:border-destructive focus:ring-destructive',
            )
          "
        />
        <button
          type="button"
          class="touch-target absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground [--touch-slop:-6px]"
          :aria-label="show ? t('auth.hidePassword') : t('auth.showPassword')"
          :aria-pressed="show"
          @click="show = !show"
        >
          <MaterialSymbol :name="show ? 'visibility' : 'visibility_off'" :size="18" />
        </button>
      </div>
    </template>
  </Fieldset>
</template>
