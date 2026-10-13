'use client';

import { PageHeading } from '@/components/blocks/page-heading';
import { Badge, Button, HStack, Switch, VStack } from '@astryxdesign/core';
import { usePageTitle } from '@/lib/use-page-title';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

/*
 * Astryx foundation showcase: core components rendered by the design system
 * itself, inside the token-backed Tailwind shell. This page is the living
 * reference for the component migration (see PR trail).
 *
 * Authored StyleX (stylex.create overrides via xstyle) is deliberately NOT
 * shown: the app runs Turbopack, and authoring StyleX requires the build-time
 * StyleX compiler (babel path) or an SWC transform. That step lands with the
 * component migration; the pre-compiled core components used here need none.
 */

const buttonVariants = ['primary', 'secondary', 'ghost', 'destructive'] as const;
const buttonSizes = ['sm', 'md', 'lg'] as const;

export default function AstryxDemoPage() {
  const t = useTranslations();
  usePageTitle(t('astryxDemo.title'));
  const [count, setCount] = useState(0);
  const [notify, setNotify] = useState(true);

  return (
    <div className="space-y-6">
      <PageHeading
        title={t('astryxDemo.title')}
        subtitle={t('astryxDemo.subtitle')}
        breadcrumbs={[
          { label: t('nav.dashboard'), href: '/admin/dashboard' },
          { label: t('astryxDemo.title') },
        ]}
      />

      <section className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-5">
        <h2 className="text-sm font-semibold text-foreground">{t('astryxDemo.variants')}</h2>
        <VStack gap={4} className="mt-4">
          <HStack gap={3}>
            {buttonVariants.map((variant) => (
              <Button
                key={variant}
                label={variant}
                variant={variant}
                clickAction={() => setCount((c) => c + 1)}
              />
            ))}
          </HStack>
          <HStack gap={3}>
            {buttonVariants.map((variant) => (
              <Button key={variant} label={variant} variant={variant} isDisabled />
            ))}
          </HStack>
        </VStack>
      </section>

      <section className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-5">
        <h2 className="text-sm font-semibold text-foreground">{t('astryxDemo.sizes')}</h2>
        <HStack gap={3} className="mt-4" align="end">
          {buttonSizes.map((size) => (
            <Button key={size} label={size} size={size} />
          ))}
        </HStack>
      </section>

      <section className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-5">
        <h2 className="text-sm font-semibold text-foreground">{t('astryxDemo.layout')}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{t('astryxDemo.layoutHint')}</p>
        <HStack gap={4} className="mt-4">
          <VStack gap={2} className="w-40">
            <div className="h-8 rounded-md bg-primary-container" />
            <div className="h-8 rounded-md bg-primary-container" />
            <div className="h-8 rounded-md bg-primary-container" />
          </VStack>
          <HStack gap={2} className="flex-1">
            <div className="h-24 flex-1 rounded-md bg-primary-container" />
            <div className="h-24 flex-1 rounded-md bg-primary-container" />
          </HStack>
        </HStack>
      </section>

      <section className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-5">
        <h2 className="text-sm font-semibold text-foreground">{t('astryxDemo.bridge')}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{t('astryxDemo.bridgeHint')}</p>
        <HStack gap={3} className="mt-4">
          <div className="rounded-lg border border-border bg-surface p-4 text-primary shadow-md">
            bg-surface · text-primary
          </div>
          <div className="rounded-lg bg-accent-muted p-4 text-on-surface">bg-accent-muted</div>
          <div className="rounded-lg bg-error-muted p-4 text-on-surface">bg-error-muted</div>
        </HStack>
      </section>

      <section className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-5">
        <h2 className="text-sm font-semibold text-foreground">{t('astryxDemo.states')}</h2>
        <HStack gap={6} className="mt-4">
          <VStack gap={2}>
            <Button label={t('astryxDemo.clickMe')} clickAction={() => setCount((c) => c + 1)} />
            <HStack gap={2}>
              <span className="text-sm text-on-surface-variant">{t('astryxDemo.clicked', { count })}</span>
              <Badge label={count} variant="neutral" />
            </HStack>
          </VStack>
          <Switch
            label={t('astryxDemo.switchLabel')}
            value={notify}
            onChange={(checked) => setNotify(checked)}
          />
        </HStack>
      </section>
    </div>
  );
}
