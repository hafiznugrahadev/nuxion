import type { LucideIcon } from 'lucide-react';

/*
 * The illustration card from the "Wayfinder Error State" Stitch concept
 * (ported from the Nuxt variant's error.vue). Always light in both themes
 * (the mirror of the landing's always-dark terminal) — Stitch art has a
 * white canvas, so the inner floating badges use fixed slate colors, not
 * theme tokens.
 */
export interface IllustrationCardProps {
  image: string;
  imageAlt: string;
  pingClass: string;
  badgeIcon: LucideIcon;
  badgeText: string;
  monoIcon: LucideIcon;
  monoTag: string;
}

export function IllustrationCard({
  image,
  imageAlt,
  pingClass,
  badgeIcon: BadgeIcon,
  badgeText,
  monoIcon: MonoIcon,
  monoTag,
}: IllustrationCardProps) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-lg">
      <div
        className="absolute inset-6 rounded-full bg-brand-blue/10 blur-2xl dark:bg-brand-mint/10"
        aria-hidden="true"
      />
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-outline-variant/50 bg-white shadow-xl dark:border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element -- bundled Stitch illustration */}
        <img
          src={image}
          alt={imageAlt}
          className="h-full w-full select-none object-contain p-4"
          draggable={false}
        />
      </div>

      {/* Floating status badge (top-right). */}
      <div className="absolute right-3 top-4 z-10 hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 shadow-md backdrop-blur-md sm:flex">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${pingClass}`}
          />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${pingClass}`} />
        </span>
        <BadgeIcon size={15} className="text-slate-600" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-700">{badgeText}</span>
      </div>

      {/* Floating mono tag (bottom-left). */}
      <div className="absolute bottom-4 left-3 z-10 hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1.5 shadow-md backdrop-blur-md sm:flex">
        <MonoIcon size={15} className="text-slate-500" aria-hidden="true" />
        <span className="font-mono text-xs font-bold text-slate-700">{monoTag}</span>
      </div>
    </div>
  );
}
