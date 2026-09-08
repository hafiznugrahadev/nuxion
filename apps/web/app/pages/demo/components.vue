<script setup lang="ts">
import { toast } from 'vue-sonner';
import type { DropdownMenuItemDef } from '~/components/ui/DropdownMenu.vue';
import { APP_NAME } from '~/lib/constants';

definePageMeta({ layout: 'dashboard', middleware: ['auth'] });
useHead({ title: `Components · ${APP_NAME}` });

// ── local demo state ────────────────────────────────────────────────────────
const progress = ref(72);
const toggleOn = ref(false);
const view = ref('grid');
const formats = ref<string[]>(['bold']);
const tab = ref('overview');
const modalOpen = ref(false);
const confirmOpen = ref(false);
const sheetOpen = ref(false);
const popoverOpen = ref(false);
const toastCount = ref(0);

const accordionItems = [
  {
    value: 'what',
    title: 'What is this page?',
    content:
      'A showcase of every shadcn-vue component in the kit, restyled to Material Design 3: tonal surfaces, shape scale, and state layers instead of ad-hoc colors.',
  },
  {
    value: 'tokens',
    title: 'Where do the colors come from?',
    content:
      'All colors resolve through the MD3 token layer in main.css (seed lime), so the demo follows the light/dark/system appearance automatically.',
  },
  {
    value: 'usage',
    title: 'How do I use these?',
    content:
      'Components live in components/ui and are auto-imported. Form fields have their own showcase on the Fields Demo page.',
  },
];

const tableRows = [
  { id: 1, user: 'Regular User', email: 'user@nuxion.test', role: 'User' },
  { id: 2, user: 'Admin', email: 'admin@nuxion.test', role: 'Admin' },
  { id: 3, user: 'Super Admin', email: 'superadmin@nuxion.test', role: 'Super Admin' },
];

const menuItems = [
  { label: 'Profile', icon: 'person' },
  { label: 'Settings', icon: 'settings' },
  { label: 'Delete account', icon: 'delete', danger: true },
];

// Demo of the shared confirmation dialog (useConfirm): dangerous entries go
// through the same confirm() as every real action in the app.
const { confirm } = useConfirm();
async function onMenuSelect(item: DropdownMenuItemDef) {
  if (item.danger) {
    const ok = await confirm({
      title: 'Delete this account?',
      description: 'Demo of the shared useConfirm() dialog. Nothing will actually happen.',
      confirmText: 'Delete',
    });
    toast.info(ok ? 'Demo only: nothing was deleted.' : 'Cancelled.');
    return;
  }
  toast.info(`Demo: "${item.label}" selected.`);
}

function showToast() {
  toastCount.value += 1;
  toast.success(`Snackbar #${toastCount.value}: MD3 inverse-surface styling.`);
}
</script>

<template>
  <div class="space-y-6">
    <PageHeading
      title="Components"
      subtitle="Every shadcn-vue component in the kit, restyled to Material Design 3."
      :breadcrumbs="[{ label: 'Demo', to: '/demo/fields' }, { label: 'Components' }]"
    />

    <!-- Buttons -->
    <section class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <h2 class="mb-4 text-sm font-semibold text-on-surface">Buttons</h2>
      <div class="flex flex-wrap items-center gap-3">
        <Button>Filled</Button>
        <Button variant="secondary">Tonal</Button>
        <Button variant="outline">Outlined</Button>
        <Button variant="ghost">Text</Button>
        <Button variant="destructive">Error</Button>
        <Button variant="link">Link</Button>
        <Button disabled>Disabled</Button>
        <Button size="icon"><MaterialSymbol name="favorite" :size="18" /></Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
      </div>
    </section>

    <!-- Badges, Avatar, Toggle -->
    <section class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <h2 class="mb-4 text-sm font-semibold text-on-surface">Badges, Avatar & Toggle</h2>
      <div class="flex flex-wrap items-center gap-3">
        <Badge>Primary</Badge>
        <Badge variant="secondary">Tonal</Badge>
        <Badge variant="muted">Muted</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="destructive">Error</Badge>
        <Separator orientation="vertical" class="h-6" />
        <Avatar alt="Admin User" />
        <Avatar initials="MD3" />
        <Separator orientation="vertical" class="h-6" />
        <Tooltip text="MD3 tooltip (inverse surface)">
          <Toggle v-model:pressed="toggleOn" :aria-label="'Favorite'">
            <MaterialSymbol :name="toggleOn ? 'favorite' : 'favorite_border'" :size="18" />
          </Toggle>
        </Tooltip>
      </div>
    </section>

    <!-- Alerts -->
    <section class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <h2 class="mb-4 text-sm font-semibold text-on-surface">Alerts</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <Alert variant="info">
          Heads up
          <template #description>Tonal containers pair status ink with a tinted surface.</template>
        </Alert>
        <Alert variant="success">
          Saved
          <template #description>Your changes were stored successfully.</template>
        </Alert>
        <Alert variant="warning">
          Storage almost full
          <template #description>Uploaded files count towards the bucket quota.</template>
        </Alert>
        <Alert variant="error">
          Something went wrong
          <template #description>Error pairs use the error-container tonal fill.</template>
        </Alert>
      </div>
    </section>

    <!-- Tabs -->
    <section class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <h2 class="mb-4 text-sm font-semibold text-on-surface">Tabs</h2>
      <Tabs
        v-model="tab"
        :tabs="[
          { value: 'overview', label: 'Overview', icon: 'space_dashboard' },
          { value: 'activity', label: 'Activity', icon: 'history' },
          { value: 'settings', label: 'Settings', icon: 'settings' },
        ]"
      >
        <template #tab-overview>
          Primary tabs: active label in primary with a 2dp bottom indicator.
        </template>
        <template #tab-activity
          >Each panel renders through the <code>#tab-{'{'}value{'}'}</code> slot.</template
        >
        <template #tab-settings>Keyboard accessible: arrows move focus, Enter selects.</template>
      </Tabs>
    </section>

    <!-- Accordion & Collapsible -->
    <section class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <h2 class="mb-4 text-sm font-semibold text-on-surface">Accordion & Collapsible</h2>
      <div class="grid gap-6 lg:grid-cols-2">
        <Accordion :items="accordionItems" />
        <Collapsible title="Inline expander (no card chrome)">
          Collapsible reveals content in place with the emphasized easing; use it inside lists or
          settings rows where a full accordion card is too heavy.
        </Collapsible>
      </div>
    </section>

    <!-- Overlays -->
    <section class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <h2 class="mb-4 text-sm font-semibold text-on-surface">Overlays</h2>
      <div class="flex flex-wrap items-center gap-3">
        <Button variant="outline" @click="modalOpen = true">Dialog</Button>
        <Button variant="outline" @click="confirmOpen = true">Alert dialog</Button>
        <Button variant="outline" @click="sheetOpen = true">Side sheet</Button>
        <Popover v-model:open="popoverOpen">
          <Button variant="outline">Popover</Button>
          <template #content>
            <p class="font-medium">MD3 popover</p>
            <p class="mt-1 text-xs text-on-surface-variant">
              surface-container-high, 8dp corners, level-2 elevation.
            </p>
          </template>
        </Popover>
        <DropdownMenu :items="menuItems" label="Account" @select="onMenuSelect">
          <Button variant="outline">
            Dropdown menu
            <MaterialSymbol name="keyboard_arrow_down" :size="18" />
          </Button>
        </DropdownMenu>
        <HoverCard>
          <Button variant="ghost">Hover card</Button>
          <template #content>
            <div class="flex items-center gap-3">
              <Avatar alt="Admin User" />
              <div>
                <p class="font-medium">Admin User</p>
                <p class="text-xs text-on-surface-variant">admin@nuxion.test</p>
              </div>
            </div>
          </template>
        </HoverCard>
        <Tooltip text="Tooltips use the inverse pair">
          <Button variant="ghost">Tooltip</Button>
        </Tooltip>
        <Button variant="outline" @click="showToast">Snackbar</Button>
      </div>
    </section>

    <!-- Progress, Skeleton, Separator -->
    <section class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <h2 class="mb-4 text-sm font-semibold text-on-surface">Progress, Skeleton & Separator</h2>
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="space-y-3">
          <Progress v-model="progress" />
          <input
            v-model.number="progress"
            type="range"
            min="0"
            max="100"
            class="w-full accent-[var(--primary)]"
            aria-label="Progress value"
          />
          <p class="text-xs text-on-surface-variant">
            4dp track, primary indicator, bound with v-model.
          </p>
        </div>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <Skeleton class="h-10 w-10 rounded-full" />
            <div class="space-y-2">
              <Skeleton class="h-4 w-48" />
              <Skeleton class="h-3 w-32" />
            </div>
          </div>
          <Separator />
          <Separator />
        </div>
      </div>
    </section>

    <!-- Toggle group & Table -->
    <section class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <h2 class="mb-4 text-sm font-semibold text-on-surface">Toggle group & Table</h2>
      <div class="space-y-6">
        <div class="flex flex-wrap items-center gap-6">
          <ToggleGroup
            v-model="view"
            :options="[
              { value: 'grid', label: 'Grid', icon: 'grid_view' },
              { value: 'list', label: 'List', icon: 'view_list' },
            ]"
          />
          <ToggleGroup
            v-model="formats"
            type="multiple"
            :options="[
              { value: 'bold', label: 'Bold', icon: 'format_bold' },
              { value: 'italic', label: 'Italic', icon: 'format_italic' },
              { value: 'underlined', label: 'Underline', icon: 'format_underlined' },
            ]"
          />
        </div>
        <Table
          :columns="[
            { key: 'user', label: 'User' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role', align: 'right' },
          ]"
          :rows="tableRows"
        >
          <!-- Heading slot: OPTIONAL — only when multiple tables share one page
               heading. Bare by default (no card, no title). -->
          <template #heading>
            <h3 class="mb-3 text-sm font-semibold text-on-surface">Accounts</h3>
          </template>
          <template #cell-user="{ value }">
            <span class="font-medium">{{ value }}</span>
          </template>
          <template #cell-role="{ value }">
            <Badge variant="muted">{{ value }}</Badge>
          </template>
        </Table>
      </div>
    </section>

    <!-- Pointers -->
    <section class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <h2 class="mb-4 text-sm font-semibold text-on-surface">Elsewhere in the kit</h2>
      <ul class="list-inside list-disc space-y-1 text-sm text-on-surface-variant">
        <li>
          Form fields (text, select, switch, slider, tags, ...):
          <NuxtLink to="/demo/fields" class="font-medium text-primary hover:underline"
            >Fields Demo</NuxtLink
          >
        </li>
        <li>
          Command palette: press
          <span class="rounded-sm border border-outline-variant bg-surface px-1.5 py-0.5 text-xs"
            >⌘ K</span
          >
          anywhere in the app
        </li>
        <li>Snackbars (toasts): global, MD3 inverse-surface styling</li>
      </ul>
    </section>

    <!-- Dialog -->
    <Modal
      v-model:open="modalOpen"
      title="MD3 dialog"
      description="28dp corners, surface-container-high, plain scrim."
    >
      <p class="text-sm text-on-surface-variant">
        Dialogs interrupt the user with important content that requires a decision. The scrim uses
        plain black at 32 percent, no blur.
      </p>
    </Modal>

    <!-- Alert dialog -->
    <AlertDialog
      v-model:open="confirmOpen"
      title="Delete this item?"
      description="This action cannot be undone. The item will be permanently removed."
      confirm-text="Delete"
      @confirm="confirmOpen = false"
    />

    <!-- Side sheet -->
    <Sheet
      v-model:open="sheetOpen"
      title="Side sheet"
      description="Slides in with the emphasized-decelerate curve."
    >
      <p class="text-on-surface-variant">
        Side sheets show secondary content anchored to the side of the screen. The open edge keeps a
        16dp corner radius.
      </p>
    </Sheet>
  </div>
</template>
