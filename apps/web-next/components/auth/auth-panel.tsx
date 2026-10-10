'use client';

import { BrandLogo } from '@/components/common/brand-logo';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

/*
 * The auth layout's photo side: one photo picked at random from the bundled
 * `public/images/auth-panels/` set (space, teal seas, blossoms). The pick
 * happens on mount — client-only — so SSR never renders a different photo
 * than the client would (no hydration mismatch); the photo fades in over the
 * scrim-colored fallback once it loads. The fixed scrim + bottom gradient
 * keep the white copy AA in both themes even over a worst-case bright photo.
 */
const AUTH_PANELS = [
  'moon-earth',
  'nebula',
  'milky-way',
  'teal-reef',
  'teal-wave',
  'blossom',
  'lavender',
] as const;

export function AuthPanel() {
  const t = useTranslations();
  const [panel, setPanel] = useState<string | null>(null);
  const [panelLoaded, setPanelLoaded] = useState(false);

  useEffect(() => {
    // Hydration-safe client randomness: the server must render the navy
    // fallback, the client picks once after mount — same contract as the
    // Nuxt variant's onMounted pick.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPanel(AUTH_PANELS[Math.floor(Math.random() * AUTH_PANELS.length)] ?? null);
  }, []);

  return (
    <div className="relative hidden overflow-hidden bg-brand-navy lg:flex lg:items-center lg:justify-center">
      {panel && (
        // eslint-disable-next-line @next/next/no-img-element -- bundled local photo, not remote content
        <img
          src={`/images/auth-panels/${panel}.webp`}
          alt=""
          className={`absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-700 ${panelLoaded ? 'opacity-100' : 'opacity-0'}`}
          draggable={false}
          onLoad={() => setPanelLoaded(true)}
        />
      )}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div
        className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black/70 to-transparent"
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-md px-8 text-center text-white">
        <BrandLogo className="mx-auto mb-6 h-16" />
        <h2 className="text-2xl font-semibold tracking-tight">{t('app.name')}</h2>
        <p className="mt-3 text-sm text-white/80">{t('appTagline')}</p>
      </div>
    </div>
  );
}
