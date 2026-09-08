<script setup lang="ts">
import { computed, ref } from 'vue';
import { useField, useForm, useFormValues } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { toast } from 'vue-sonner';
import { useUpload } from '~/composables/useUpload';
import { APP_NAME } from '~/lib/constants';

definePageMeta({ layout: 'dashboard', middleware: ['auth'] });
useHead({ title: `Fields Showcase · ${APP_NAME}` });

const schema = toTypedSchema(
  z.object({
    fullName: z.string().min(1, 'Required'),
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Min 6 characters'),
    birthday: z.string().optional(),
    bio: z.string().optional(),
    role: z.string().min(1, 'Select a role'),
    status: z.string().min(1, 'Select a status'),
    digest: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    confidence: z.number().optional(),
    skills: z.array(z.string()).optional(),
    avatar: z.any().optional(),
    agreed: z.boolean().refine((v) => v === true, 'You must agree to the terms'),
    notifications: z.boolean().optional(),
  }),
);

const { handleSubmit } = useForm({
  validationSchema: schema,
  initialValues: {
    confidence: 50,
    notifications: false,
    agreed: false,
    permissions: [],
    skills: [],
  },
});

const rawValues = useFormValues();

const displayValues = computed(() => {
  const copy: Record<string, unknown> = { ...rawValues.value };
  if (copy.avatar instanceof File) copy.avatar = copy.avatar.name;
  return copy;
});

const { uploadFile } = useUpload();
const uploading = ref(false);
const uploadedUrl = ref<string | null>(null);

// Rich text demo state (standalone v-model, outside the zod form).
const editorHtml = ref('');

// Demonstrates FileField → useUpload end-to-end: if an avatar file was picked,
// upload it on submit and surface the stored public URL. Other fields are just
// validated. (This page is behind the auth middleware, so /files is authorised.)
const onSubmit = handleSubmit(async (values) => {
  uploadedUrl.value = null;
  const avatar = values.avatar;
  if (avatar instanceof File) {
    uploading.value = true;
    try {
      const { url } = await uploadFile(avatar, 'demo');
      uploadedUrl.value = url;
    } catch (err) {
      toast.error((err as Error)?.message || 'Upload failed');
      return;
    } finally {
      uploading.value = false;
    }
  }
  toast.info('Demo submit: nothing was saved.');
});

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
];

const permissionOptions = [
  { label: 'Read', value: 'read' },
  { label: 'Write', value: 'write' },
  { label: 'Delete', value: 'delete' },
  { label: 'Manage Users', value: 'manage_users' },
];

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Pending', value: 'pending' },
];

const digestOptions = [
  { label: 'Instantly', value: 'instant' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
];

// Status memakai segmented (ToggleGroup) — tetap terikat form via useField.
const { value: statusValue } = useField<string>('status');
</script>

<template>
  <div class="space-y-6">
    <PageHeading
      title="Fields Showcase"
      subtitle="All reusable form field components, integrated with VeeValidate."
    />

    <form class="grid grid-cols-1 gap-6 lg:grid-cols-3" @submit="onSubmit">
      <!-- Left: fields -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Text Inputs -->
        <div class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
          <h2 class="mb-4 text-sm font-semibold text-muted-foreground">Text Inputs</h2>
          <div class="space-y-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                name="fullName"
                label="Full name"
                placeholder="Your name"
                prefix-icon="person"
                required
              />
              <TextField
                name="email"
                label="Email"
                type="email"
                placeholder="name@example.com"
                prefix-icon="alternate_email"
                hint="We'll only use this to sign you in."
                required
              />
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PasswordField
                name="password"
                label="Password"
                placeholder="••••••••"
                prefix-icon="lock"
                hint="Must be at least 8 characters."
                required
              />
              <DateField name="birthday" label="Birthday" hint="Used to calculate your age." />
            </div>
            <TextareaField
              name="bio"
              label="Bio"
              placeholder="Tell us a little about yourself…"
              :rows="3"
              :maxlength="200"
              hint="A short introduction shown on your profile."
            />
          </div>
        </div>

        <!-- Selection -->
        <div class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
          <h2 class="mb-4 text-sm font-semibold text-muted-foreground">Selection</h2>
          <div class="space-y-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                name="role"
                label="Role"
                :options="roleOptions"
                placeholder="Choose a role…"
                hint="Controls what this account can do."
                required
              />
              <SelectField
                name="permissions"
                label="Permissions"
                :options="permissionOptions"
                placeholder="Choose permissions…"
                multiple
                hint="Pick as many as needed."
              />
            </div>
            <!-- M3 segmented button: untuk pilihan 3-5 opsi, ini pola yang
                 direkomendasikan menggantikan radio vertikal. -->
            <div class="space-y-1.5">
              <span class="text-sm font-medium leading-none">
                Status<span class="ml-0.5 text-destructive">*</span>
              </span>
              <ToggleGroup v-model="statusValue" :options="statusOptions" />
              <p class="text-xs text-on-surface-variant">
                Segmented selection (MD3 segmented button pattern).
              </p>
            </div>
            <!-- Radio tetap didemokan untuk kasus daftar vertikal yang lebih
                 panjang / opsi dengan deskripsi. -->
            <RadioGroupField
              name="digest"
              label="Notification digest"
              :options="digestOptions"
              hint="How often we batch non-urgent notifications."
            />
          </div>
        </div>

        <!-- Rich Text -->
        <div class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
          <h2 class="mb-4 text-sm font-semibold text-muted-foreground">Rich Text</h2>
          <div class="space-y-1.5">
            <span class="text-sm font-medium leading-none">Bio (formatted)</span>
            <Editor
              v-model="editorHtml"
              placeholder="Write something, and upload an image…"
              min-height="7rem"
            />
            <p class="text-xs text-on-surface-variant">
              Toolbar toggles take the tonal pill when active. Images upload to the shared storage
              API and are inserted inline.
            </p>
          </div>
          <div v-if="editorHtml" class="mt-4">
            <p class="mb-1.5 text-xs font-medium text-on-surface-variant">HTML output (v-model)</p>
            <pre
              class="max-h-40 overflow-auto rounded-sm bg-surface-container p-3 text-xs leading-relaxed text-on-surface"
              >{{ editorHtml }}</pre>
          </div>
        </div>

        <!-- Boolean Controls -->
        <div class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
          <h2 class="mb-4 text-sm font-semibold text-muted-foreground">Boolean Controls</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CheckboxField name="agreed" label="I agree to the terms and conditions" required />
            <SwitchField name="notifications" label="Email notifications" />
          </div>
        </div>

        <!-- Specialized -->
        <div class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
          <h2 class="mb-4 text-sm font-semibold text-muted-foreground">Specialized</h2>
          <div class="space-y-4">
            <SliderField
              name="confidence"
              label="Confidence level"
              :min="0"
              :max="100"
              :step="5"
              hint="Drag the thumb: track and value follow the MD3 slider spec."
            />
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TagInputField
                name="skills"
                label="Skills"
                placeholder="Type and press Enter…"
                hint="Each entry becomes an MD3 input chip."
              />
              <FileField
                name="avatar"
                label="Avatar"
                accept="image/*"
                placeholder="No image chosen"
                hint="PNG or JPG, up to 5MB."
              />
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <!-- Proof of FileField → useUpload: the picked avatar, stored via POST /files -->
          <div
            v-if="uploadedUrl"
            class="flex items-center gap-3 rounded-lg bg-surface-container p-3"
          >
            <img
              :src="uploadedUrl"
              alt="Uploaded avatar"
              class="h-12 w-12 rounded-lg object-cover"
            />
            <div class="min-w-0">
              <p class="text-xs font-medium text-foreground">Uploaded via /files</p>
              <a
                :href="uploadedUrl"
                target="_blank"
                class="block truncate text-xs text-primary hover:underline"
              >
                {{ uploadedUrl }}
              </a>
            </div>
          </div>
          <div class="flex justify-end">
            <Button type="submit" size="lg" :disabled="uploading">
              {{ uploading ? 'Uploading…' : 'Submit form' }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Right: live values -->
      <div class="lg:col-span-1">
        <div class="sticky top-6 rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
          <h2 class="mb-3 text-sm font-semibold text-muted-foreground">Live values</h2>
          <pre
            class="max-h-[calc(100vh-12rem)] overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed text-foreground"
            >{{ JSON.stringify(displayValues, null, 2) }}</pre>
        </div>
      </div>
    </form>
  </div>
</template>
