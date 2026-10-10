import { AuthPanel } from '@/components/auth/auth-panel';
import { LanguageSwitcher } from '@/components/shell/language-switcher';
import { ThemeToggle } from '@/components/shell/theme-toggle';

/*
 * Auth layout (port of the Nuxt variant's layouts/auth.vue): form on the
 * left, random bundled photo under an AA-safe scrim on the right (lg+ only).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Language + theme, top-right */}
      <div className="absolute right-5 top-5 z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-background px-5 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      <AuthPanel />
    </div>
  );
}
