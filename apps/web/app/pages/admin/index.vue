<script setup lang="ts">
// `/admin` is a bare section URL — land authenticated users on the dashboard.
// The auth middleware still guards it; unauthenticated visitors end up on
// /login with a redirect back here.
definePageMeta({ middleware: ['auth'] });
await navigateTo('/admin/dashboard', { replace: true });
</script>

<template>
  <div />
</template>
