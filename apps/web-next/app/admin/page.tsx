import { redirect } from 'next/navigation';

// `/admin` is a bare section URL — land visitors on the dashboard (AdminGuard
// still protects it; unauthenticated visitors end up on /login with a
// redirect back).
export default function AdminIndexPage() {
  redirect('/admin/dashboard');
}
