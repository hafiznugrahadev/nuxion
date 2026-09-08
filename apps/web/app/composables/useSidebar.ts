/**
 * Sidebar UI state shared between the header (toggle) and the layout/sidebar.
 * - `isExpanded`: desktop expanded vs. icon-only rail.
 * - `isMobileOpen`: off-canvas drawer state on small screens.
 */
export function useSidebar() {
  const isExpanded = useState('sidebar-expanded', () => true);
  const isMobileOpen = useState('sidebar-mobile-open', () => false);

  return {
    isExpanded,
    isMobileOpen,
    toggleExpanded: () => (isExpanded.value = !isExpanded.value),
    toggleMobile: () => (isMobileOpen.value = !isMobileOpen.value),
    closeMobile: () => (isMobileOpen.value = false),
  };
}
