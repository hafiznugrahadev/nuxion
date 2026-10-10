'use client';

import { PageHeading } from '@/components/blocks/page-heading';
import { Editor } from '@/components/ui/editor';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

/**
 * Editor demo — the tiptap WYSIWYG over the shared storage API, with its
 * HTML output mirrored below (what a form would persist). The Nuxt variant
 * demos the editor inside its fields showcase; this variant gives the editor
 * its own page until a content feature consumes it.
 */
export default function EditorDemoPage() {
  const t = useTranslations();
  const [html, setHtml] = useState('');

  return (
    <div className="space-y-6">
      <PageHeading
        title={t('editorDemo.title')}
        subtitle={t('editorDemo.subtitle')}
        breadcrumbs={[
          { label: t('nav.dashboard'), href: '/admin/dashboard' },
          { label: t('editorDemo.title') },
        ]}
      />

      <Editor
        value={html}
        onChange={setHtml}
        placeholder={t('editorDemo.subtitle')}
        minHeight="10rem"
      />

      <div className="rounded-lg border border-outline-variant bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{t('editorDemo.output')}</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-container-lowest p-4 font-mono text-xs leading-relaxed text-on-surface">
          {html || '<p></p>'}
        </pre>
      </div>
    </div>
  );
}
