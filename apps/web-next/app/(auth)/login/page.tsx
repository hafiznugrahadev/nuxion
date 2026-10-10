import { LoginForm } from '@/components/auth/login-form';
import { getBranding } from '@/lib/branding-server';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const branding = await getBranding();
  return { title: `${t('auth.signIn')} · ${branding.appName}` };
}

export default function LoginPage() {
  return <LoginForm />;
}
