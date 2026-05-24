"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { useUIStore } from "@/lib/stores/ui.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";
import { MessSelector } from "@/components/mess/MessSelector";
import { useMessStore } from "@/lib/stores/mess.store";
import { DashboardPrefetcher } from "@/components/providers/DashboardPrefetcher";
import { VacationMobileStrip } from "@/components/shared/VacationMobileStrip";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen } = useUIStore();
  const { user, isInitialized } = useAuthStore();
  const { activeMess } = useMessStore();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect once session verification completes and no user found
  useEffect(() => {
    if (isInitialized && !user) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
    }
  }, [isInitialized, user, router, pathname]);

  // No user at all (not even in store) — show loader briefly while verifying
  if (!user) return <PageLoader />;

  // User in store — render immediately (optimistic).
  // AuthProvider verifies session in background; if invalid, clears user → redirect above fires.
  if (!activeMess) return <MessSelector />;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn("transition-all duration-300 pt-14", isSidebarOpen ? "lg:pl-64" : "lg:pl-16")}>
        <Header />
        <VacationMobileStrip />
        <main className="min-h-[calc(100vh-3.5rem)] pb-6">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
      <DashboardPrefetcher />
    </div>
  );
}
