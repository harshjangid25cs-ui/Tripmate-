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

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between relative">
      <div className="flex-1 pb-24">{children}</div>
      <BottomNav activeTab={activeTab} onChangeTab={handleTabChange} />
    </div>
  );
}
