<script setup lang="ts">
import { apiFieldErrors } from '~/lib/api-errors';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extensions';
import { useUpload } from '~/composables/useUpload';
import {
  computed,
  ref,
  watch,
  onUpdated,
  onBeforeUnmount,
  useAttrs,
  type HTMLAttributes,
} from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 WYSIWYG editor (tiptap v3). Outlined-field chrome, toolbar of icon
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
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const { t } = useI18n();
const imageError = ref('');

function editorAttributes() {
  const attributes: Record<string, string> = {
    class: 'prose-mirror',
    role: 'textbox',
    'aria-multiline': 'true',
  };
  for (const key of ['id', 'aria-labelledby', 'aria-describedby', 'aria-invalid', 'aria-label']) {
    if (attrs[key] !== undefined) attributes[key] = String(attrs[key]);
  }
  if (!attributes['aria-labelledby'] && !attributes['aria-label'])
    attributes['aria-label'] = t('editor.label');
  return attributes;
}

const containerAttrs = computed(() =>
  Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key !== 'id' && !key.startsWith('aria-')),
  ),
);

const { uploadFile } = useUpload();
const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const editor = useEditor({
  editable: !props.disabled,
  content: props.modelValue,
  extensions: [
    StarterKit,
    Image.configure({ inline: false, allowBase64: false }),
    // v3 default empty-node class is `is-empty`; keep the v2 class the
    // main.css placeholder rule targets.
    Placeholder.configure({
      placeholder: props.placeholder || '',
      emptyEditorClass: 'is-editor-empty',
    }),
  ],
  editorProps: {
    attributes: editorAttributes(),
  },
  onUpdate: ({ editor: e }) => emit('update:modelValue', e.getHTML()),
});

onUpdated(() => editor.value?.setOptions({ editorProps: { attributes: editorAttributes() } }));
watch(
  () => props.disabled,
  (disabled) => editor.value?.setEditable(!disabled),
  { immediate: true },
);

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
  imageError.value = '';
  if (!file.type.startsWith('image/')) {
    imageError.value = t('editor.chooseImage');
    if (fileInput.value) fileInput.value.value = '';
    return;
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    imageError.value = t('editor.imageTooLarge', { max: MAX_MB });
    if (fileInput.value) fileInput.value.value = '';
    return;
  }
  uploading.value = true;
  try {
    const { url } = await uploadFile(file, 'editor');
    editor.value?.chain().focus().setImage({ src: url }).run();
    emit('update:modelValue', editor.value?.getHTML() ?? '');
  } catch (err) {
    imageError.value =
      apiFieldErrors(err).file || (err as Error)?.message || t('editor.uploadFailed');
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}
</script>

<template>
  <!-- Outlined-field chrome: sama seperti Input (4dp, outline, focus 2dp primary). -->
  <div
    v-bind="containerAttrs"
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
        <Fieldset :label="t('editor.imageLabel')" :error="imageError" label-class="sr-only">
          <template #default="{ id, describedBy, invalid }">
            <button
              type="button"
              class="touch-target relative flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface-variant/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :aria-label="t('editor.imageLabel')"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
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
              :id="id"
              ref="fileInput"
              type="file"
              accept="image/*"
              class="sr-only"
              :disabled="disabled || uploading"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
              @change="onImageChange"
            />
          </template>
        </Fieldset>
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
