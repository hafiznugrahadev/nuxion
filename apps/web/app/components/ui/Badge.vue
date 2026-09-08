<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        // MD3 tonal pairs: filled role + its on-color.
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'border-outline text-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
        // Status pills: tinted surface + status ink (same ink in both themes
        // keeps AA contrast on the 10-15% tint).
        success: 'border-transparent bg-success/12 text-success',
        warning: 'border-transparent bg-warning/15 text-warning',
        info: 'border-transparent bg-info/12 text-info',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

type BadgeVariants = VariantProps<typeof badgeVariants>;
const props = defineProps<{ variant?: BadgeVariants['variant']; class?: string }>();
</script>

<template>
  <span :class="cn(badgeVariants({ variant }), props.class)"><slot /></span>
</template>
