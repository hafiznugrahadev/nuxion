'use client';

import { getXhrPending, subscribeXhrPending } from '@/lib/xhr-progress';
import { useSyncExternalStore } from 'react';

/**
 * YouTube-style top progress bar for in-flight API XHRs (port of the Nuxt
 * variant's XhrProgressBar — CSS lives in globals.css under .xhr-progress-bar).
 * Route navigation stays a Nuxt concern; the bar here tracks XHRs only.
 */
export function XhrProgressBar() {
  const pending = useSyncExternalStore(subscribeXhrPending, getXhrPending, () => 0);
  return <div className="xhr-progress-bar" data-active={pending > 0} aria-hidden="true" />;
}
