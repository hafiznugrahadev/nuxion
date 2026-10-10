import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

// `relative` anchors the state-layer pseudo-element (the utility itself
// must not set position — see globals.css).
const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // MD3 filled: primary surface; hover/press state layer (on-color
        // overlay) comes from .state-layer in globals.css.
        default: 'state-layer bg-primary text-primary-foreground',
        // MD3 filled error.
        destructive: 'state-layer bg-destructive text-destructive-foreground',
        // MD3 outlined: hairline outline, primary label.
        outline: 'state-layer border border-outline bg-transparent text-primary',
        // MD3 filled tonal: secondary-container pair.
        secondary: 'state-layer bg-secondary text-secondary-foreground',
        // MD3 text button.
        ghost: 'state-layer text-primary',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // MD3 heights: 32 / 40 / 48 dp.
        default: 'h-10 px-6',
        sm: 'h-8 px-4',
        lg: 'h-12 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
