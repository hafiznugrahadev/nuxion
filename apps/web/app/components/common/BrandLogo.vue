<template>
  <!-- Both variants ship on true transparency: full-color for light surfaces,
       white for dark — no backdrop in either theme, the mark carries its own
       contrast. Size comes from the parent via class (width follows 3:2). -->
  <span class="inline-flex shrink-0 items-center">
    <img src="/images/nuxion.webp" alt="" aria-hidden="true" class="h-full w-auto dark:hidden" />
    <img
      src="/images/nuxion-light.webp"
      alt=""
      aria-hidden="true"
      class="hidden h-full w-auto dark:block"
    />
  </span>
</template>
