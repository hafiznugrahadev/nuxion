/**
 * Same-origin API proxy — keeps the API container off the public internet.
 * Cookies, Authorization headers and Set-Cookie responses pass through
 * untouched, so auth flows behave exactly like a first-party API.
 */
export default defineEventHandler((event) => proxyToApi(event, '/api'));
