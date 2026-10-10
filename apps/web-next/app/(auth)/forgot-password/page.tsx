import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t('auth.forgotTitle')} · ${t('app.name')}` };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
