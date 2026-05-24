"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useIsSuperAdmin } from "@/lib/hooks/use-super-admin";
import { SuperAdminSidebar } from "@/components/super-admin/SuperAdminSidebar";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Shield } from "lucide-react";
import { useLanguage } from "@/lib/hooks/use-language";

function AccessDenied() {
  const { t } = useLanguage();
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4 p-6 text-center">
      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
        <Shield className="w-8 h-8 text-red-400" />
      </div>
      <h1 className="text-2xl font-bold">{t.superAdmin.accessDenied}</h1>
      <p className="text-slate-400 text-sm">{t.superAdmin.accessDeniedDesc}</p>
      <button
        onClick={() => router.push("/dashboard")}
        className="mt-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition-colors"
      >
        {t.superAdmin.backToDashboard}
      </button>
    </div>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isInitialized } = useAuthStore();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const { data: isSuperAdmin, isLoading: isCheckingRole } = useIsSuperAdmin();

  useEffect(() => {
    if (isMounted && isInitialized && !isLoading && !user) {
      router.push("/login?redirectTo=/super-admin");
    }
  }, [isMounted, isInitialized, isLoading, user, router]);

  if (!isMounted) return <PageLoader />;
  if (!user && (!isInitialized || isLoading)) return <PageLoader />;
  if (!user) return null;
  if (isCheckingRole) return <PageLoader />;
  if (isSuperAdmin === false) return <AccessDenied />;

  return (
    <div className="min-h-screen bg-slate-50">
      <SuperAdminSidebar />
      {/* Desktop: offset for sidebar | Mobile: offset for top header */}
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <main className="min-h-screen p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
