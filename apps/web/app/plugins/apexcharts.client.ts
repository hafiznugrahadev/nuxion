import VueApexCharts from 'vue3-apexcharts';

/**
 * ApexCharts touches `window`, so it's registered client-side only. Chart
 * components must still be wrapped in <ClientOnly> so SSR skips them entirely.
 * Registers the global <apexchart> component.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueApexCharts);
});
