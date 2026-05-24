"use client";
import type { ReactNode } from "react";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import type { Permission } from "@/lib/types";

interface PermissionGateProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const allowed = useHasPermission(permission);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
