import type VueApexCharts from 'vue3-apexcharts';

// vue3-apexcharts registers <apexchart> globally via a client plugin; declare it
// so templates type-check.
declare module 'vue' {
  interface GlobalComponents {
    apexchart: typeof VueApexCharts;
  }
}

export {};
