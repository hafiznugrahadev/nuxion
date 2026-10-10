import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { getBranding } from '@/lib/branding-server';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const branding = await getBranding();
  return { title: `${t('auth.twoFactor.setupTitle')} · ${branding.appName}` };
}

export default function TwoFactorSetupPage() {
  return <TwoFactorSetup />;
}
