import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t('auth.resetTitle')} · ${t('app.name')}` };
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
