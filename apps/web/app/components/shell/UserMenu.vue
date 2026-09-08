<script setup lang="ts">
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import { useAuthStore } from '~/stores/auth';

/**
 * The authenticated-user dropdown (avatar → Profile / Sign out). Shared between
 * the top-right header and the sidebar footer.
 * - `variant`: `compact` = header trigger (avatar + optional name); `full` = a
 *   full-width row (avatar + name/email) for the sidebar footer.
 * - `placement`: which way the menu opens (`down` for header, `up` for footer).
 * - `showDetails`: hide name/email text in the collapsed sidebar rail.
 */
const props = withDefaults(
  defineProps<{
    variant?: 'compact' | 'full';
    placement?: 'down' | 'up';
    showDetails?: boolean;
  }>(),
  { variant: 'compact', placement: 'down', showDetails: true },
);

const auth = useAuthStore();
const open = ref(false);

async function onLogout() {
  open.value = false;
  await auth.logout();
  toast.success('Signed out');
  await navigateTo('/login');
}

function go(path: string) {
  open.value = false;
  navigateTo(path);
}

const initials = computed(() => {
  const name = auth.user?.name?.trim();
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
});

const panelClass = computed(() =>
  props.placement === 'up' ? 'bottom-full mb-2 left-0 min-w-[14rem]' : 'top-full mt-2 right-0 w-56',
);
</script>

<template>
  <ClientOnly>
    <div v-if="auth.isAuthenticated" class="relative">
      <!-- Trigger -->
      <button
        type="button"
        data-testid="user-menu-trigger"
        :class="
          variant === 'full'
            ? 'flex w-full items-center gap-3 rounded-full p-2 text-left transition-colors hover:bg-on-surface/8'
            : 'flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-on-surface/8'
        "
        @click="open = !open"
      >
        <img
          v-if="auth.user?.avatarUrl"
          :src="auth.user.avatarUrl"
          :alt="auth.user?.name ?? 'User'"
          class="h-9 w-9 shrink-0 rounded-full object-cover"
        />
        <span
          v-else
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-on-primary-container"
        >
          {{ initials }}
        </span>

        <template v-if="showDetails">
          <span v-if="variant === 'full'" class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-foreground">
              {{ auth.user?.name }}
            </span>
            <span class="block truncate text-xs text-muted-foreground">{{ auth.user?.email }}</span>
          </span>
          <span v-else class="hidden text-sm font-medium text-foreground sm:inline">
            {{ auth.user?.name }}
          </span>
          <MaterialSymbol
            :class="[
              'shrink-0 text-muted-foreground transition-transform',
              variant === 'compact' && 'hidden sm:inline',
              open && 'rotate-180',
            ]"
            name="keyboard_arrow_down"
            :size="20"
          />
        </template>
      </button>

      <!-- Dropdown: MD3 menu surface -->
      <template v-if="open">
        <!-- click-away catcher -->
        <button class="fixed inset-0 z-40 cursor-default" @click="open = false" />
        <div
          :class="[
            'absolute z-50 overflow-hidden rounded-md bg-surface-container-high p-1.5 shadow-theme-md',
            panelClass,
          ]"
        >
          <div class="border-b border-outline-variant px-4 py-3">
            <p class="truncate text-sm font-medium text-foreground">{{ auth.user?.name }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ auth.user?.email }}</p>
          </div>
          <div class="pt-1.5">
            <button
              class="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground"
              @click="go('/profile')"
            >
              <MaterialSymbol name="person" :size="18" />
              {{ $t('nav.profile') }}
            </button>
            <button
              data-testid="logout-button"
              class="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
              @click="onLogout"
            >
              <MaterialSymbol name="logout" :size="18" />
              {{ $t('nav.signOut') }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Logged out -->
    <Button
      v-else
      variant="outline"
      :size="variant === 'full' ? 'default' : 'sm'"
      :class="variant === 'full' ? 'w-full' : undefined"
      @click="navigateTo('/login')"
    >
      {{ $t('nav.login') }}
    </Button>

    <template #fallback>
      <div
        :class="
          variant === 'full'
            ? 'h-13 w-full rounded-full bg-muted'
            : 'h-9 w-20 rounded-full bg-muted'
        "
      />
    </template>
  </ClientOnly>
</template>
