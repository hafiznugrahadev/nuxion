<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef } from 'vue';

const props = defineProps<{
  name: string;
  label?: string;
  required?: boolean;
  hint?: string;
}>();

const { value, errorMessage } = useField<boolean>(toRef(props, 'name'));
</script>

<template>
  <Fieldset
    :name="name"
    :label="label"
    :required="required"
    :error="errorMessage"
    :hint="hint"
    inline
    label-class="cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
  >
    <template #default="{ id, describedBy, invalid }">
      <Checkbox :id="id" v-model="value" :aria-describedby="describedBy" :aria-invalid="invalid" />
    </template>
  </Fieldset>
</template>
