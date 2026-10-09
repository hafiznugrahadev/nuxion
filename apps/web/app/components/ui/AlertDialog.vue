<script setup lang="ts">
import {
  AlertDialog as AlertDialogRoot,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogHeader,
  AlertDialogFooter,
} from './alert-dialog';

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  }>(),
  { destructive: true, description: undefined, confirmText: undefined, cancelText: undefined },
);
const { t } = useI18n();
const emit = defineEmits<{ confirm: []; closeAutoFocus: [event: Event] }>();
const open = defineModel<boolean>('open', { default: false });
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogContent
      v-bind="description ? {} : { 'aria-describedby': undefined }"
      @close-auto-focus="emit('closeAutoFocus', $event)"
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="description">{{ description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter class="mt-6">
        <AlertDialogCancel>{{ cancelText ?? t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          :variant="destructive ? 'destructive' : 'default'"
          @click="emit('confirm')"
        >
          {{ confirmText ?? t('common.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialogRoot>
</template>
