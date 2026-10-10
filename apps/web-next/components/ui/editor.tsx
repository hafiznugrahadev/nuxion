'use client';

import { Field } from '@/components/common/field';
import { apiFieldErrors } from '@/lib/api-errors';
import { uploadFile } from '@/lib/upload';
import { EditorContent, useEditor } from '@tiptap/react';
import { Placeholder } from '@tiptap/extensions';
import Image from '@tiptap/extension-image';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
  Image as ImageIcon,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

/**
 * MD3 WYSIWYG editor (tiptap v3) — the React port of the Nuxt variant's
 * ui/Editor.vue: outlined-field chrome, toolbar of icon toggles (aria-pressed
 * → secondary-container tonal), undo/redo, and image upload through the
 * shared storage API (POST /files). v-model carries the HTML produced by
 * tiptap's schema.
 */
export function Editor({
  value = '',
  onChange,
  placeholder = '',
  disabled = false,
  minHeight = '8rem',
  id,
  'aria-describedby': describedByProp,
  'aria-invalid': invalidProp,
  className,
}: {
  value?: string;
  /** Reports the editor's HTML on every change (the v-model contract). */
  onChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  className?: string;
}) {
  const t = useTranslations('editor');
  const [imageError, setImageError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    editable: !disabled,
    content: value,
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      // v3 default empty-node class is `is-empty`; keep the class the
      // globals.css placeholder rule targets.
      Placeholder.configure({
        placeholder: placeholder || '',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose-mirror',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(id ? { id } : {}),
        ...(describedByProp ? { 'aria-describedby': describedByProp } : {}),
        ...(invalidProp !== undefined ? { 'aria-invalid': String(invalidProp) } : {}),
        'aria-label': t('label'),
      },
    },
    onUpdate: ({ editor: instance }) => onChange?.(instance.getHTML()),
  });

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  // Sink eksternal → editor (hanya saat berbeda, hindari loop onUpdate).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // tiptap v3: emitUpdate lives on the options object (default flipped to true).
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  interface ToolDef {
    label: string;
    icon: LucideIcon;
    isActive?: () => boolean;
    run: () => void;
  }

  const tools: ToolDef[] = editor
    ? [
        {
          label: 'Bold',
          icon: Bold,
          isActive: () => editor.isActive('bold'),
          run: () => editor.chain().focus().toggleBold().run(),
        },
        {
          label: 'Italic',
          icon: Italic,
          isActive: () => editor.isActive('italic'),
          run: () => editor.chain().focus().toggleItalic().run(),
        },
        {
          label: 'Strikethrough',
          icon: Strikethrough,
          isActive: () => editor.isActive('strike'),
          run: () => editor.chain().focus().toggleStrike().run(),
        },
        {
          label: 'Heading 2',
          icon: Heading2,
          isActive: () => editor.isActive('heading', { level: 2 }),
          run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          label: 'Heading 3',
          icon: Heading3,
          isActive: () => editor.isActive('heading', { level: 3 }),
          run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        },
        {
          label: 'Bulleted list',
          icon: List,
          isActive: () => editor.isActive('bulletList'),
          run: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
          label: 'Numbered list',
          icon: ListOrdered,
          isActive: () => editor.isActive('orderedList'),
          run: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
          label: 'Quote',
          icon: Quote,
          isActive: () => editor.isActive('blockquote'),
          run: () => editor.chain().focus().toggleBlockquote().run(),
        },
        {
          label: 'Undo',
          icon: Undo2,
          run: () => {
            if (editor.can().chain().focus().undo().run()) editor.chain().focus().undo().run();
          },
        },
        {
          label: 'Redo',
          icon: Redo2,
          run: () => {
            if (editor.can().chain().focus().redo().run()) editor.chain().focus().redo().run();
          },
        },
      ]
    : [];

  const MAX_MB = 5;
  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setImageError('');
    if (!file.type.startsWith('image/')) {
      setImageError(t('chooseImage'));
      input.value = '';
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setImageError(t('imageTooLarge', { max: MAX_MB }));
      input.value = '';
      return;
    }
    setUploading(true);
    void (async () => {
      try {
        const { url } = await uploadFile(file, 'editor');
        editor?.chain().focus().setImage({ src: url }).run();
        onChange?.(editor?.getHTML() ?? '');
      } catch (err) {
        setImageError(apiFieldErrors(err).file || (err as Error)?.message || t('uploadFailed'));
      } finally {
        setUploading(false);
        input.value = '';
      }
    })();
  }

  return (
    // Outlined-field chrome: sama seperti Input (4dp, outline, focus 2dp primary).
    <div
      className={`w-full overflow-hidden rounded-sm border border-outline bg-transparent focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${
        disabled ? 'pointer-events-none opacity-50' : ''
      } ${className ?? ''}`}
    >
      {/* Toolbar: ikon toggle pressed = tonal secondary-container (aria-pressed). */}
      {editor && (
        <div
          className="flex flex-wrap items-center gap-0.5 border-b border-outline-variant p-1.5"
          role="toolbar"
          aria-label="Text formatting"
        >
          {tools.map((tool) => {
            const Icon = tool.icon;
            const pressed = tool.isActive?.();
            return (
              <button
                key={tool.label}
                type="button"
                className="touch-target relative flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface-variant/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-secondary-container aria-pressed:text-on-secondary-container"
                aria-label={tool.label}
                aria-pressed={pressed}
                data-testid={`editor-${tool.label.toLowerCase().replace(/\s+/g, '-')}`}
                disabled={disabled}
                onClick={tool.run}
              >
                <Icon size={18} aria-hidden="true" />
              </button>
            );
          })}
          <span className="mx-1 h-5 w-px bg-outline-variant" aria-hidden="true" />
          <Field error={imageError}>
            {({ id: fieldId, describedBy }) => (
              <>
                <button
                  type="button"
                  className="touch-target relative flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface-variant/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t('imageLabel')}
                  aria-describedby={describedBy}
                  disabled={disabled || uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? (
                    <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <ImageIcon size={18} aria-hidden="true" />
                  )}
                </button>
                <label htmlFor={fieldId} className="sr-only">
                  {t('imageLabel')}
                </label>
                <input
                  id={fieldId}
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={disabled || uploading}
                  onChange={onImageChange}
                />
              </>
            )}
          </Field>
        </div>
      )}
      <EditorContent editor={editor} className="px-4 py-3" style={{ minHeight }} />
    </div>
  );
}
