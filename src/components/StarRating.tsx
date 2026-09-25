import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = 16,
  className,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          className={cn("leading-none", onChange ? "cursor-pointer" : "cursor-default")}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
        >
          <Star
            style={{ width: size, height: size }}
            className={
              star <= Math.round(value)
                ? "fill-primary text-primary"
                : "text-muted-foreground/40"
            }
          />
        </button>
      ))}
    </span>
  );
}
