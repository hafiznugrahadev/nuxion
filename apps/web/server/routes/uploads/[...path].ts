/**
 * Local-driver uploads are served by the API outside the /api prefix.
 * Proxied here so locally-stored files get first-party URLs on the web
 * domain (STORAGE_PUBLIC_BASE_URL = APP_URL in compose).
 */
export default defineEventHandler((event) => proxyToApi(event, '/uploads'));
