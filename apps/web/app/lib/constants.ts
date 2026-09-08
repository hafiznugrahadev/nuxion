/** App-wide constants (explicit import, not auto-imported per spec). */
export const APP_NAME = 'Nuxion';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  PAGE_SIZES: [10, 20, 50, 100] as const,
} as const;
