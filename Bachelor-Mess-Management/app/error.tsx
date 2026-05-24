"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/hooks/use-language";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center animate-fade-in max-w-md px-4">
        <p className="text-6xl mb-4">⚠️</p>
        <h1 className="text-2xl font-bold text-foreground">{t.errorPage.title}</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          {t.errorPage.desc}
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <Button onClick={() => reset()}>{t.errorPage.retry}</Button>
          <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
            {t.errorPage.goToDashboard}
          </Button>
        </div>
      </div>
    </div>
  );
}
