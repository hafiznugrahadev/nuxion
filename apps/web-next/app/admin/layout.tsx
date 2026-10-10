'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminHeader } from '@/components/shell/admin-header';
import { AppSidebar } from '@/components/shell/app-sidebar';
import { getSidebarState, subscribeSidebar } from '@/lib/use-sidebar';
import { useSyncExternalStore } from 'react';

/**
 * Admin shell (port of the Nuxt variant's admin layout): fixed MD3 sidebar +
 * sticky header, content shifted by the sidebar width on desktop. The whole
 * area renders client-side behind AdminGuard — parity with the Nuxt variant's
 * CSR admin island (routeRules ssr:false there).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isExpanded } = useSyncExternalStore(subscribeSidebar, getSidebarState, getSidebarState);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <AppSidebar />

        {/* Content shifts to make room for the fixed sidebar on desktop. */}
        <div
          className={`min-h-screen transition-[margin] duration-300 ease-emphasized ${
            isExpanded ? 'lg:ml-64' : 'lg:ml-20'
          }`}
        >
          <AdminHeader />
          {/* Heading contract: every admin page opens with <PageHeading> —
              title required, subtitle + breadcrumbs optional. */}
          <main className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
