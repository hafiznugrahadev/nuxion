/*
 * Single brand mark for every theme: full-color, transparent background
 * (no tile/backdrop treatment — the same rule the Nuxt variant holds).
 * The uploaded-logo override (Settings → Branding) lands with the settings
 * stage; until then the bundled mark is always used. Size comes from the
 * parent via className (width follows the aspect).
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- branding asset, not content imagery */}
      <img src="/images/nuxion.webp" alt="" aria-hidden="true" className={className} />
    </span>
  );
}
