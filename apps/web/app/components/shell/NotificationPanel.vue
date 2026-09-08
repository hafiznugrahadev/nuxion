<script setup lang="ts">
import { PopoverRoot, PopoverTrigger, PopoverContent } from 'reka-ui';
import { useNotificationsStore } from '~/stores/notifications';
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();
const store = useNotificationsStore();
const open = ref(false);

watch(open, (val) => {
  if (val && auth.isAuthenticated && !store.fetched) {
    store.fetch();
  }
});

const typeIcon: Record<string, string> = {
  info: 'info',
  success: 'check_circle',
  warning: 'warning',
  error: 'cancel',
};
// Status inks resolve through the app's status tokens (semantic in both themes).
const typeClass: Record<string, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function handleClick(id: string) {
  await store.markRead(id);
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <!-- MD3 standard icon button: 40dp circle, state-layer hover, no border -->
      <button
        type="button"
        class="touch-target relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground"
        :aria-label="$t('notifications.title')"
      >
        <MaterialSymbol name="notifications" :size="22" />
        <!-- MD3 badge: error-colored dot -->
        <span
          v-if="store.unreadCount > 0"
          class="absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-surface"
        />
      </button>
    </PopoverTrigger>

    <PopoverContent
      align="end"
      :side-offset="8"
      class="z-50 w-80 rounded-lg bg-surface-container-high p-0 text-foreground shadow-theme-md outline-none"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <span class="text-sm font-semibold text-foreground">{{ $t('notifications.title') }}</span>
        <button
          v-if="store.unreadCount > 0"
          type="button"
          class="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 rounded-sm px-1.5 py-1"
          @click="store.markAllRead()"
        >
          <MaterialSymbol name="check" :size="14" />
          {{ $t('notifications.markAllRead') }}
        </button>
      </div>

      <!-- List -->
      <div class="max-h-80 overflow-y-auto">
        <div v-if="store.loading" class="flex items-center justify-center py-8">
          <span class="text-sm text-muted-foreground">{{ $t('state.loading') }}</span>
        </div>

        <div
          v-else-if="store.notifications.length === 0"
          class="flex flex-col items-center justify-center gap-1 py-8 text-center"
        >
          <MaterialSymbol name="inbox" :size="32" class="text-muted-foreground" />
          <p class="text-sm font-medium text-foreground">{{ $t('notifications.empty') }}</p>
          <p class="text-xs text-muted-foreground">{{ $t('notifications.emptyHint') }}</p>
        </div>

        <ul v-else>
          <li
            v-for="n in store.notifications"
            :key="n.id"
            class="flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-on-surface-variant/8"
            :class="{ 'bg-secondary-container/40': !n.readAt }"
            @click="handleClick(n.id)"
          >
            <MaterialSymbol
              :name="typeIcon[n.type] ?? 'info'"
              :size="18"
              class="mt-0.5 shrink-0"
              :class="typeClass[n.type] ?? 'text-muted-foreground'"
            />
            <div class="min-w-0 flex-1">
              <p
                class="text-sm font-medium text-foreground"
                :class="{ 'font-semibold': !n.readAt }"
              >
                {{ n.title }}
              </p>
              <p class="mt-0.5 text-xs text-muted-foreground">{{ n.body }}</p>
              <p class="mt-1 text-xs text-muted-foreground/70">{{ relativeTime(n.createdAt) }}</p>
            </div>
            <span v-if="!n.readAt" class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-error" />
          </li>
        </ul>
      </div>
    </PopoverContent>
  </PopoverRoot>
</template>
