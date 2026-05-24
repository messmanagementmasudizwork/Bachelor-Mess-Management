"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/hooks/use-language";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center animate-fade-in">
        <p className="text-7xl font-bold text-muted-foreground/30">404</p>
        <h1 className="mt-4 text-2xl font-bold text-foreground">{t.notFound.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.notFound.desc}</p>
        <Link href="/dashboard">
          <Button className="mt-6">{t.notFound.goToDashboard}</Button>
        </Link>
      </div>
    </div>
  );
}
