"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNav, type NavTabId } from "@/components/ui/bottom-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab: NavTabId = React.useMemo(() => {
    if (pathname.startsWith("/trips")) return "trips";
    if (pathname.startsWith("/commercial")) return "commercial";
    if (pathname.startsWith("/profile")) return "profile";
    return "home";
  }, [pathname]);

  const handleTabChange = React.useCallback(
    (tab: NavTabId) => {
      router.push(`/${tab}`);
    },
    [router]
  );

  const handleTabPrefetch = React.useCallback(
    (tab: NavTabId) => {
      router.prefetch(`/${tab}`);
    },
    [router]
  );

  // Warm tab routes in background after idle to make navigation instantaneous
  React.useEffect(() => {
    const prefetchRoutes = () => {
      router.prefetch("/home");
      router.prefetch("/trips");
      router.prefetch("/commercial");
      router.prefetch("/profile");
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const handle = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(prefetchRoutes);
      return () => {
        if ("cancelIdleCallback" in window) {
          (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle);
        }
      };
    } else {
      const timer = setTimeout(prefetchRoutes, 500);
      return () => clearTimeout(timer);
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between relative">
      <div className="flex-1 pb-24">{children}</div>
      <BottomNav
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        onPrefetchTab={handleTabPrefetch}
      />
    </div>
  );
}
