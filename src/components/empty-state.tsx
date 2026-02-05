"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action: string;
  actionHref: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionHref,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          {description}
        </p>
        <Button asChild>
          <Link href={actionHref}>
            <Plus className="w-4 h-4 mr-2" />
            {action}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
