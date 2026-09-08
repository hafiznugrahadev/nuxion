<script setup lang="ts">
const { isExpanded } = useSidebar();
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppSidebar />

    <!-- Content shifts to make room for the fixed sidebar on desktop. -->
    <div
      :class="[
        'min-h-screen transition-[margin] duration-300 ease-emphasized',
        isExpanded ? 'lg:ml-64' : 'lg:ml-20',
      ]"
    >
      <AppHeader />
      <!-- Heading contract: Nuxt pages can't fill layout named slots, so the
           page heading lives in the page itself as <PageHeading> — title
           required, subtitle + breadcrumbs optional — always as the FIRST
           element, so every admin page renders an identical heading. -->
      <main class="mx-auto w-full max-w-screen-2xl p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
