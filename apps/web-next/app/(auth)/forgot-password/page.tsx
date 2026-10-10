import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { getBranding } from '@/lib/branding-server';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const branding = await getBranding();
  return { title: `${t('auth.forgotTitle')} · ${branding.appName}` };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
