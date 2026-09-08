<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { APP_NAME } from '~/lib/constants';

const auth = useAuthStore();
const route = useRoute();
const { isExpanded, isMobileOpen, closeMobile } = useSidebar();

interface NavItem {
  label: string;
  to: string;
  icon: string; // Material Symbols name
  adminOnly?: boolean;
}

// Only existing routes — kept minimal per the starter kit's surface.
const items: NavItem[] = [
  { label: 'nav.dashboard', to: '/admin/dashboard', icon: 'grid_view' },
  { label: 'nav.users', to: '/admin/users', icon: 'group', adminOnly: true },
  { label: 'nav.fieldsDemo', to: '/admin/demo/fields', icon: 'science' },
  { label: 'nav.componentsDemo', to: '/admin/demo/components', icon: 'widgets' },
];

// Auth roles are only known on the client (the access token lives in memory), so
// admin-only items must stay hidden until after mount. Rendering them during SSR
// — or on the client's first (hydration) pass — would make the server nav (guest
// view) and the hydrated client nav (authed view) diverge, which Vue reports as a
// hydration mismatch. `import.meta.client` is already true during hydration, so a
// post-mount flag is what keeps the first client render identical to the server's.
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});

const visibleItems = computed(() =>
  items.filter((i) => !i.adminOnly || (mounted.value && auth.isAuthenticated && auth.isAdmin)),
);

function isActive(to: string) {
  return route.path === to || route.path.startsWith(to + '/');
}

// The icon-only rail is a desktop concept; the mobile drawer is always full.
const showFull = computed(() => isMobileOpen.value || isExpanded.value);
</script>

<template>
  <!-- Mobile scrim (MD3 modal drawer) -->
  <div v-if="isMobileOpen" class="fixed inset-0 z-40 bg-scrim lg:hidden" @click="closeMobile" />

  <!-- MD3 navigation drawer (256dp) / rail (80dp collapsed), no divider:
       separation comes from tonal surfaces, not a border. -->
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-[width,transform] duration-300 ease-emphasized',
      'w-64',
      isExpanded ? 'lg:w-64' : 'lg:w-20',
      isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    ]"
  >
    <!-- Brand -->
    <div :class="['flex h-16 items-center', showFull ? 'px-4' : 'justify-center px-0']">
      <NuxtLink
        to="/admin/dashboard"
        class="flex items-center gap-2.5 font-semibold"
        @click="closeMobile"
      >
        <BrandLogo class="h-10" />
        <span v-if="showFull" class="text-base tracking-tight text-foreground">{{ APP_NAME }}</span>
      </NuxtLink>
    </div>

    <!-- Nav: active item is the MD3 full pill (secondary-container tonal).
         Labeled because the page has a second nav landmark (the breadcrumb). -->
    <nav :aria-label="$t('nav.menu')" class="flex-1 overflow-y-auto px-3 py-2">
      <p
        :class="[
          'mb-2 px-4 text-xs font-medium text-muted-foreground',
          showFull ? '' : 'text-center',
        ]"
      >
        {{ showFull ? $t('nav.menu') : '•••' }}
      </p>
      <ul class="space-y-1">
        <li v-for="item in visibleItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            :class="[
              'group relative flex items-center rounded-full text-sm font-medium transition-colors',
              showFull ? 'gap-3 px-4 py-3' : 'justify-center px-0 py-3',
              isActive(item.to)
                ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-on-surface/8 hover:text-foreground',
            ]"
            @click="closeMobile"
          >
            <MaterialSymbol :name="item.icon" :size="22" class="shrink-0" />
            <span v-if="showFull">{{ $t(item.label) }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <!-- Footer — user dropdown (same menu as the top-right header) -->
    <div :class="['border-t border-sidebar-border', showFull ? 'p-3' : 'flex justify-center p-2']">
      <UserMenu variant="full" placement="up" :show-details="showFull" />
    </div>
  </aside>
</template>
