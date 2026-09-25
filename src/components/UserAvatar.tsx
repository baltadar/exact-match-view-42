import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const cache = new Map<string, string>();

export function useAvatarUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(path && cache.get(path) ? cache.get(path)! : null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    if (path.startsWith("http")) {
      setUrl(path);
      return;
    }
    const cached = cache.get(path);
    if (cached) {
      setUrl(cached);
      return;
    }
    void supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24)
      .then(({ data }) => {
        if (!active || !data?.signedUrl) return;
        cache.set(path, data.signedUrl);
        setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
}

export function UserAvatar({
  path,
  name,
  className,
}: {
  path: string | null | undefined;
  name: string;
  className?: string;
}) {
  const url = useAvatarUrl(path);
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-accent text-accent-foreground",
        "size-12 text-sm font-medium",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name} className="size-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}
