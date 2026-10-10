import { RegisterForm } from '@/components/auth/register-form';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t('auth.registerTitle')} · ${t('app.name')}` };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
