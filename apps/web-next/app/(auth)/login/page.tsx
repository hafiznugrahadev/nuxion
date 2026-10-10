import { LoginForm } from '@/components/auth/login-form';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t('auth.signIn')} · ${t('app.name')}` };
}

export default function LoginPage() {
  return <LoginForm />;
}
