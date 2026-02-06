"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; dotColor: string }> = {
  running: { variant: "default", dotColor: "bg-green-600" },
  active: { variant: "default", dotColor: "bg-green-600" },
  online: { variant: "default", dotColor: "bg-green-600" },
  stopped: { variant: "secondary", dotColor: "bg-muted-foreground" },
  offline: { variant: "secondary", dotColor: "bg-muted-foreground" },
  inactive: { variant: "secondary", dotColor: "bg-muted-foreground" },
  pending: { variant: "outline", dotColor: "bg-yellow-500" },
  deploying: { variant: "outline", dotColor: "bg-blue-500" },
  failed: { variant: "destructive", dotColor: "bg-red-500" },
  suspended: { variant: "destructive", dotColor: "bg-red-500" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant={config.variant} className={cn("gap-1.5", className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dotColor)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
