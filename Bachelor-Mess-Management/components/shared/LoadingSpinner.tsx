import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/get-t";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({ size = "md", className, fullPage }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  const spinner = (
    <div
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent",
        sizeClasses[size],
        className
      )}
    />
  );

  if (fullPage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          {spinner}
          <p className="text-sm text-muted-foreground animate-pulse">{getT().loading}</p>
        </div>
      </div>
    );
  }

  return spinner;
}

export function PageLoader() {
  return <LoadingSpinner fullPage size="lg" />;
}

export function CardLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner size="md" />
    </div>
  );
}
