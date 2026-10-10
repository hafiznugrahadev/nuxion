import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t('auth.twoFactor.setupTitle')} · ${t('app.name')}` };
}

export default function TwoFactorSetupPage() {
  return <TwoFactorSetup />;
}
