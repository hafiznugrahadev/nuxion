<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { toast } from 'vue-sonner';
import { useUpload } from '~/composables/useUpload';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 WYSIWYG editor (tiptap v2). Outlined-field chrome, toolbar of icon
 * toggles (aria-pressed → secondary-container tonal, never data-state: the
 * toolbar buttons are not as-child merged, but aria-pressed stays the
 * collision-proof convention), undo/redo, and image upload through the
 * shared storage API (POST /api/files). v-model carries sanitized-enough
 * HTML produced by tiptap's schema.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    disabled?: boolean;
    /** Roughly rows-like height control for the writing area. */
    minHeight?: string;
    class?: HTMLAttributes['class'];
  }>(),
  { modelValue: '', placeholder: '', disabled: false, minHeight: '8rem' },
);
const emit = defineEmits<{ 'update:modelValue': [html: string] }>();

const { uploadFile } = useUpload();
const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Image.configure({ inline: false, allowBase64: false }),
    Placeholder.configure({ placeholder: props.placeholder || '' }),
  ],
  editorProps: {
    attributes: {
      class: 'prose-mirror',
      'aria-label': 'Rich text editor',
    },
  },
  onUpdate: ({ editor: e }) => emit('update:modelValue', e.getHTML()),
});

// Sink eksternal → editor (hanya saat berbeda, hindari loop onUpdate).
watch(
  () => props.modelValue,
  (next) => {
    if (editor.value && next !== editor.value.getHTML())
      // tiptap v3: emitUpdate pindah ke object options (default-nya berubah jadi true).
      editor.value.commands.setContent(next || '', { emitUpdate: false });
  },
);

onBeforeUnmount(() => editor.value?.destroy());

type ActiveCheck = () => boolean;
interface ToolDef {
  label: string;
  icon: string;
  isActive?: ActiveCheck;
  run: () => void;
}

const tools = computed<ToolDef[]>(() => {
  const e = editor.value;
  if (!e) return [];
  const can = () => e.can().chain().focus();
  return [
    {
      label: 'Bold',
      icon: 'format_bold',
      isActive: () => e.isActive('bold'),
      run: () => e.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      icon: 'format_italic',
      isActive: () => e.isActive('italic'),
      run: () => e.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Strikethrough',
      icon: 'strikethrough_s',
      isActive: () => e.isActive('strike'),
      run: () => e.chain().focus().toggleStrike().run(),
    },
    {
      label: 'Heading 2',
      icon: 'format_h2',
      isActive: () => e.isActive('heading', { level: 2 }),
      run: () => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Heading 3',
      icon: 'format_h3',
      isActive: () => e.isActive('heading', { level: 3 }),
      run: () => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: 'Bulleted list',
      icon: 'format_list_bulleted',
      isActive: () => e.isActive('bulletList'),
      run: () => e.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      icon: 'format_list_numbered',
      isActive: () => e.isActive('orderedList'),
      run: () => e.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Quote',
      icon: 'format_quote',
      isActive: () => e.isActive('blockquote'),
      run: () => e.chain().focus().toggleBlockquote().run(),
    },
    {
      label: 'Undo',
      icon: 'undo',
      run: () => {
        if (can().undo().run()) e.chain().focus().undo().run();
      },
    },
    {
      label: 'Redo',
      icon: 'redo',
      run: () => {
        if (can().redo().run()) e.chain().focus().redo().run();
      },
    },
  ];
});

const MAX_MB = 5;
async function onImageChange(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast.error('Please choose an image file');
    return;
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    toast.error(`Image must be under ${MAX_MB}MB`);
    return;
  }
  uploading.value = true;
  try {
    const { url } = await uploadFile(file, 'editor');
    editor.value?.chain().focus().setImage({ src: url }).run();
    emit('update:modelValue', editor.value?.getHTML() ?? '');
  } catch (err) {
    toast.error((err as Error)?.message || 'Upload failed');
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}
</script>

<template>
  <!-- Outlined-field chrome: sama seperti Input (4dp, outline, focus 2dp primary). -->
  <div
    :class="
      cn(
        'w-full overflow-hidden rounded-sm border border-outline bg-transparent focus-within:border-primary focus-within:ring-1 focus-within:ring-primary',
        disabled && 'pointer-events-none opacity-50',
        props.class,
      )
    "
  >
    <ClientOnly>
      <!-- Toolbar: ikon toggle pressed = tonal secondary-container (aria-pressed). -->
      <div
        v-if="editor"
        class="flex flex-wrap items-center gap-0.5 border-b border-outline-variant p-1.5"
        role="toolbar"
        :aria-label="'Text formatting'"
      >
        <button
          v-for="tool in tools"
          :key="tool.label"
          type="button"
          class="touch-target relative flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface-variant/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-secondary-container aria-pressed:text-on-secondary-container"
          :aria-label="tool.label"
          :aria-pressed="tool.isActive ? tool.isActive() : undefined"
          :data-testid="`editor-${tool.label.toLowerCase().replace(/\s+/g, '-')}`"
          :disabled="disabled"
          @click="tool.run"
        >
          <MaterialSymbol :name="tool.icon" :size="18" />
        </button>
        <span class="mx-1 h-5 w-px bg-outline-variant" aria-hidden="true" />
        <button
          type="button"
          class="touch-target relative flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface-variant/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Upload image"
          :disabled="disabled || uploading"
          @click="fileInput?.click()"
        >
          <MaterialSymbol
            :name="uploading ? 'progress_activity' : 'image'"
            :size="18"
            :class="uploading && 'animate-spin'"
          />
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="sr-only"
          @change="onImageChange"
        />
      </div>
      <EditorContent :editor="editor" class="px-4 py-3" :style="{ minHeight: props.minHeight }" />
      <template #fallback>
        <div class="px-4 py-3" :style="{ minHeight: props.minHeight }">
          <div class="h-4 w-2/3 animate-pulse rounded-sm bg-surface-container-highest" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
