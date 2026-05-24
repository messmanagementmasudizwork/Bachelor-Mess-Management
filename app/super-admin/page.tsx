"use client";
import { usePlatformStats } from "@/lib/hooks/use-super-admin";
import { StatCard } from "@/components/super-admin/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  CheckCircle,
  XCircle,
  Shield,
} from "lucide-react";
import { useLanguage } from "@/lib/hooks/use-language";

function StatsGrid() {
  const { t } = useLanguage();
  const { data: stats, isLoading } = usePlatformStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label={t.superAdmin.stats.totalMesses}        value={stats.totalMesses}        icon={Building2}   color="blue"   sub={t.superAdmin.stats.thisMonthNew.replace("{count}", String(stats.newMessesThisMonth))} />
      <StatCard label={t.superAdmin.stats.activeMesses}       value={stats.activeMesses}       icon={CheckCircle} color="green"  />
      <StatCard label={t.superAdmin.stats.suspendedMesses}    value={stats.suspendedMesses}    icon={XCircle}     color="red"    />
      <StatCard label={t.superAdmin.stats.totalUsers}         value={stats.totalUsers}         icon={Users}       color="purple" sub={t.superAdmin.stats.thisMonthNew.replace("{count}", String(stats.newUsersThisMonth))} />
      <StatCard label={t.superAdmin.stats.activeMembers}      value={stats.totalActiveMembers} icon={UserCheck}   color="green"  />
      <StatCard label={t.superAdmin.stats.bannedUsers}        value={stats.bannedUsers}        icon={UserX}       color="red"    />
      <StatCard label={t.superAdmin.stats.newMessesThisMonth} value={stats.newMessesThisMonth} icon={TrendingUp}  color="orange" />
      <StatCard label={t.superAdmin.stats.newUsersThisMonth}  value={stats.newUsersThisMonth}  icon={TrendingUp}  color="blue"   />
    </div>
  );
}

export default function SuperAdminOverviewPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.superAdmin.platformOverview}</h1>
          <p className="text-sm text-slate-500">{t.superAdmin.platformSubtitle}</p>
        </div>
      </div>

      {/* Stats */}
      <StatsGrid />

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {[
          { href: "/super-admin/messes",      title: t.superAdmin.sections.messManagement,   desc: t.superAdmin.sections.messManagementDesc,   icon: Building2, color: "bg-blue-500"   },
          { href: "/super-admin/users",        title: t.superAdmin.sections.users,             desc: t.superAdmin.sections.usersDesc,             icon: Users,     color: "bg-purple-500" },
          { href: "/super-admin/permissions",  title: t.superAdmin.sections.globalPermissions, desc: t.superAdmin.sections.globalPermissionsDesc, icon: Shield,    color: "bg-orange-500" },
        ].map(({ href, title, desc, icon: Icon, color }) => (
          <a
            key={href}
            href={href}
            className="flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow group"
          >
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">{title}</p>
              <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
