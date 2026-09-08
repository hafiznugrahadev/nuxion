<script setup lang="ts">
// Default layout mirrors the dashboard shell so any page without an explicit
// layout still gets the sidebar + header chrome.
const { isExpanded } = useSidebar();
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppSidebar />
    <div
      :class="[
        'min-h-screen transition-[margin] duration-300 ease-emphasized',
        isExpanded ? 'lg:ml-64' : 'lg:ml-20',
      ]"
    >
      <AppHeader />
      <main class="mx-auto w-full max-w-screen-2xl p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
