/*
 * Single brand mark for every theme: full-color, transparent background
 * (no tile/backdrop treatment — the same rule the Nuxt variant holds).
 * The uploaded logo (Settings → Branding) wins once set; until then the
 * bundled mark renders. SSR renders the bundled mark (defaults paint with no
 * flash); the client swaps in the uploaded one after BrandingProvider seeds.
 */
import { getBranding } from '@/lib/branding';

export function BrandLogo({ className }: { className?: string }) {
  const src =
    typeof window === 'undefined'
      ? '/images/nuxion.webp'
      : getBranding().logoUrl || '/images/nuxion.webp';
  return (
    <span className="inline-flex shrink-0 items-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- branding asset, not content imagery */}
      <img src={src} alt="" aria-hidden="true" className={className} />
    </span>
  );
}
