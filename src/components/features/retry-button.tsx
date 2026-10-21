"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryButton({ label = "Reintentar" }: { label?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button variant="outline" disabled={isPending} onClick={() => startTransition(() => router.refresh())}>
      <RotateCw className={isPending ? "animate-spin" : undefined} />
      {label}
    </Button>
  );
}
